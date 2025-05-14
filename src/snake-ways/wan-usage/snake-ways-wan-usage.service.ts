import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { ApiProperty } from '@nestjs/swagger';
import { Observable, Subscription } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { differenceInDays, startOfDay, startOfMonth } from 'date-fns';
const chalk = require('chalk');

/**
 * Snake Ways WAN Usage Interface
 */
export class WanUsage {
  /**
   * Bytes usage
   */
  @ApiProperty({
    description: 'Bytes used during this period',
    example: 214697155,
  })
  Bytes: number;

  /**
   * End time of record as unix timestamp, 0: record is active
   */
  @ApiProperty({
    description: 'End time of record as unix timestamp, 0 if record is active',
    example: 0,
  })
  Endtime: number;

  /**
   * Maximum allowed usage bytes
   */
  @ApiProperty({
    description: 'Maximum allowed usage bytes',
    example: 0,
  })
  MaxBytes: number;

  /**
   * WAN Name
   */
  @ApiProperty({
    description: 'User-friendly name for this WAN connection',
    example: 'VSAT',
  })
  Name: string;

  /**
   * Start time of record as unix timestamp
   */
  @ApiProperty({
    description: 'Start time of record as unix timestamp',
    example: 1746058632,
  })
  Starttime: number;

  /**
   * WAN ID - 32 Byte hex string
   */
  @ApiProperty({
    description: 'WAN unique identifier (32 byte hex string)',
    example: 'FCF62321165611EDA56E193DE7CF5745',
  })
  WanID: string;
}

@Injectable()
export class SnakeWaysWanUsageService
  extends SnakeWaysBaseService
  implements OnModuleInit, OnModuleDestroy
{
  private wanUsagePollingSubscription: Subscription;
  private wanUsageDataStream$: Observable<{ wanusage: WanUsage[] } | null>;
  private pollingActive = false;
  private pollingIntervalInMins: number;
  private defaultDaysToFetch: number;

  constructor(
    protected readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super(httpService);
    // Override logger with this class name
    Object.defineProperty(this, 'logger', {
      value: new Logger(SnakeWaysWanUsageService.name),
    });

    // Get polling interval from config
    this.pollingIntervalInMins =
      this.configService.get<number>('SNAKE_WAYS_WAN_USAGE_POLLING_INTERVAL') ||
      1; // Default to 1 minute

    // Get default days to fetch from config
    // We will only fetch the current month's usage data
    const today = new Date();
    this.defaultDaysToFetch =
      differenceInDays(startOfDay(today), startOfMonth(today)) + 1;
  }

  /**
   * Initialize polling when module starts
   */
  async onModuleInit() {
    this.startPollingWanUsage();
  }

  /**
   * Start polling WAN usage from Snake Ways
   */
  private startPollingWanUsage() {
    if (this.pollingActive) {
      this.logger.log(
        chalk.yellow('WAN Usage Polling is already active, not starting again'),
      );
      return;
    }

    this.pollingActive = true;

    this.logger.log(
      chalk.blue.bold(
        `Starting to poll WAN usage from Snake Ways every ${this.pollingIntervalInMins} minutes`,
      ),
    );

    // Create the endpoint with the days parameter
    const endpoint = `/wanusage?days=${this.defaultDaysToFetch}`;

    this.wanUsageDataStream$ = this.createPollingObservable<{
      wanusage: WanUsage[];
    }>(
      endpoint,
      this.pollingIntervalInMins * 1000, // Convert minutes to milliseconds
    );

    this.wanUsagePollingSubscription = this.wanUsageDataStream$.subscribe({
      next: async (data) => {
        if (data?.wanusage) {
          await this.syncWanUsageWithDatabase(data.wanusage);
        }
      },
      error: (error) => {
        // This should rarely be called since we're catching errors in the observable
        this.logger.error(
          chalk.red.bold('Unexpected error in WAN usage polling subscription'),
          error,
        );
        // Don't set pollingActive to false here to allow retries
        // Instead, log that we'll try to recover
        this.logger.warn(
          chalk.yellow.bold('Attempting to recover from polling error'),
        );
      },
      complete: () => {
        this.logger.warn(
          chalk.yellow.bold(
            'Polling WAN usage from Snake Ways completed or stopped due to max failures',
          ),
        );
        this.pollingActive = false;
      },
    });
  }

  /**
   * Attempt to restart polling if it has stopped
   * This can be called by a controller endpoint or scheduled job
   */
  public async restartPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(
        chalk.blue.bold('Attempting to restart WAN usage polling'),
      );
      // Reset the service availability status
      this.resetServiceAvailability();
      // Reset the consecutive failures counter for this endpoint
      this.resetConsecutiveFailures('/wanusage');
      // Start polling again
      this.startPollingWanUsage();
      return true;
    }
    return false;
  }

  /**
   * Sync received WAN usage with the database
   */
  private async syncWanUsageWithDatabase(wanUsageData: WanUsage[]) {
    try {
      this.logger.log(
        chalk.cyan(
          `Syncing ${chalk.bold(wanUsageData.length)} WAN usage records from Snake Ways`,
        ),
      );

      const today = new Date();
      const startOfToday = startOfDay(today);

      for (const usageData of wanUsageData) {
        // Find the corresponding WAN
        const wan = await this.prismaService.wan.findUnique({
          where: { id: usageData.WanID },
        });

        if (!wan) {
          this.logger.warn(
            chalk.yellow(
              `WAN with ID ${usageData.WanID} not found, skipping usage record`,
            ),
          );
          continue;
        }

        // Check if we already have a snapshot for this WAN today
        const existingSnapshot =
          await this.prismaService.wanUsageSnapshot.findFirst({
            where: {
              wanId: wan.id,
              snapshotDate: {
                gte: startOfToday,
              },
            },
          });

        const bytesUsed = BigInt(usageData.Bytes);
        const maxBytes = BigInt(usageData.MaxBytes);

        if (!existingSnapshot) {
          // Create a new snapshot
          await this.prismaService.wanUsageSnapshot.create({
            data: {
              wanId: wan.id,
              snapshotDate: today,
              bytesUsed,
              maxBytes,
              wanName: usageData.Name,
              originalStartTime: BigInt(usageData.Starttime),
              originalEndTime: BigInt(usageData.Endtime),
            },
          });

          this.logger.log(
            chalk.green.bold(
              `Created WAN usage snapshot for ${usageData.Name} (${usageData.WanID})`,
            ),
          );
        } else {
          // Update the existing snapshot
          await this.prismaService.wanUsageSnapshot.update({
            where: { id: existingSnapshot.id },
            data: {
              bytesUsed,
              maxBytes,
              wanName: usageData.Name,
              originalStartTime: BigInt(usageData.Starttime),
              originalEndTime: BigInt(usageData.Endtime),
              updatedAt: today,
            },
          });

          this.logger.log(
            chalk.green.bold(
              `Updated WAN usage snapshot for ${usageData.Name} (${usageData.WanID})`,
            ),
          );
        }
      }

      this.logger.log(
        chalk.green.bold('WAN usage sync completed successfully'),
      );
    } catch (error) {
      this.logger.error(
        chalk.red.bold('Failed to sync WAN usage with database'),
        error,
      );
    }
  }

  /**
   * Get WAN usage data
   * @param days Optional - returns only records for last x days, default 90 days
   * @param wanId Optional - returns only records for WAN with this ID
   */
  async getWanUsage(days?: number, wanId?: string): Promise<WanUsage[]> {
    try {
      let endpoint = '/wanusage';

      // Build query parameters
      const params: string[] = [];
      if (days !== undefined) {
        params.push(`days=${days}`);
      }
      if (wanId) {
        params.push(`wanid=${wanId}`);
      }

      // Add query parameters to endpoint if any exist
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const response = await this.get<{ wanusage: WanUsage[] }>(endpoint);
      return response?.wanusage || [];
    } catch (error) {
      this.logger.error(chalk.red('Failed to get WAN usage data'), error);
      throw new Error(`Failed to get WAN usage data: ${error.message}`);
    }
  }

  /**
   * Force an immediate synchronization with Snake Ways
   * @param days Number of days of history to fetch (default: 90)
   * @returns Object containing the number of WAN usage records synchronized
   */
  async forceSync(days?: number): Promise<{ count: number }> {
    this.logger.log(
      chalk.yellow.bold(
        'Manually triggering WAN usage synchronization with Snake Ways',
      ),
    );
    try {
      // Use provided days or default
      const daysToFetch = days || this.defaultDaysToFetch;

      // Fetch latest WAN usage from Snake Ways
      const response = await this.get<{ wanusage: WanUsage[] }>(
        `/wanusage?days=${daysToFetch}`,
      );

      if (!response?.wanusage) {
        this.logger.warn(
          chalk.yellow(
            'No WAN usage data returned from Snake Ways during force sync',
          ),
        );
        return { count: 0 };
      }

      // Perform synchronization
      await this.syncWanUsageWithDatabase(response.wanusage);

      this.logger.log(
        chalk.green.bold(
          `Force sync completed: ${chalk.white(response.wanusage.length)} WAN usage records synchronized`,
        ),
      );

      return { count: response.wanusage.length };
    } catch (error) {
      this.logger.error(chalk.red.bold('Force sync failed'), error);
      throw new Error(`Force synchronization failed: ${error.message}`);
    }
  }

  // Stop polling when application shuts down
  onModuleDestroy() {
    if (this.wanUsagePollingSubscription) {
      this.logger.log(chalk.blue('Stopping WAN usage polling'));
      this.wanUsagePollingSubscription.unsubscribe();
      this.pollingActive = false;
    }
  }
}
