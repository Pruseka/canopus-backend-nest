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
import {
  differenceInDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subHours,
  startOfHour,
  endOfHour,
  endOfDay,
  endOfMonth,
} from 'date-fns';
import { WanUsageEntity } from '../../wan/entities/wan-usage.entity';
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

/**
 * Type for aggregated WAN usage data
 */
export interface AggregatedWanUsage {
  wanId: string;
  wanName: string;
  totalBytes: number;
  maxBytes: number;
  usagePercentage: number;
  formattedTotalBytes: string;
  formattedMaxBytes: string;
  periodStart: Date;
  periodEnd: Date;
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
        const existingSnapshot = await this.prismaService.wanUsage.findFirst({
          where: {
            wanId: wan.id,
            snapshotDate: {
              gte: startOfToday,
            },
          },
        });

        // Transform the data for database operations
        const { createData, updateData } = this.transformToPrismaWanUsage(
          usageData,
          wan.id,
        );

        if (!existingSnapshot) {
          // Create a new snapshot
          await this.prismaService.wanUsage.create({
            data: createData,
          });

          this.logger.log(
            chalk.green.bold(
              `Created WAN usage snapshot for ${usageData.Name} (${usageData.WanID})`,
            ),
          );
        } else {
          // Update the existing snapshot
          await this.prismaService.wanUsage.update({
            where: { id: existingSnapshot.id },
            data: updateData,
          });

          this.logger.log(
            chalk.green(
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
   * Transform Snake Ways WAN usage to Prisma WAN usage schema
   * @param usageData The WAN usage data from Snake Ways
   * @param wanId The WAN ID in our database
   * @returns Object containing data for create and update operations
   */
  private transformToPrismaWanUsage(usageData: WanUsage, wanId: string) {
    // Convert bytes to BigInt
    const bytes = BigInt(usageData.Bytes);
    const maxBytes = BigInt(usageData.MaxBytes);

    // Convert timestamps to Date objects
    const startTime = usageData.Starttime
      ? new Date(usageData.Starttime * 1000)
      : new Date();

    // If Endtime is 0, the record is active (no end time)
    const endTime =
      usageData.Endtime > 0 ? new Date(usageData.Endtime * 1000) : null;

    const today = new Date();

    // Create data for create operation
    const createData = {
      wanId,
      snapshotDate: today,
      bytes,
      maxBytes,
      startTime,
      endTime,
    };

    // Create data for update operation
    const updateData = {
      bytes,
      maxBytes,
      startTime,
      endTime,
      updatedAt: today,
    };

    return { createData, updateData };
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

  /**
   * Transforms Snake Ways WAN usage data to WanUsageEntity objects for API responses
   * @param wanUsageData The WAN usage data from Snake Ways
   * @returns Array of WanUsageEntity objects
   */
  transformToWanUsageEntities(wanUsageData: WanUsage[]): WanUsageEntity[] {
    const wanUsageEntities: WanUsageEntity[] = [];

    for (const usageData of wanUsageData) {
      const startTime = usageData.Starttime
        ? new Date(usageData.Starttime * 1000)
        : new Date();

      const endTime =
        usageData.Endtime > 0 ? new Date(usageData.Endtime * 1000) : null;

      const bytes = BigInt(usageData.Bytes);
      const maxBytes = BigInt(usageData.MaxBytes);

      // Create a WanUsageEntity instance with constructor
      const wanUsageEntity = new WanUsageEntity({
        id: `temp-${usageData.WanID}-${usageData.Starttime}`, // Temporary ID until saved to database
        wanId: usageData.WanID,
        wanName: usageData.Name, // Include the WAN name from the API response
        bytes,
        maxBytes,
        startTime,
        endTime,
        snapshotDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      wanUsageEntities.push(wanUsageEntity);
    }

    return wanUsageEntities;
  }

  /**
   * Get aggregated WAN usage data for reporting
   * @param period The period type for aggregation (daily, weekly, monthly)
   * @param wanIds Optional array of WAN IDs to filter by
   * @returns Aggregated WAN usage data
   */
  async getAggregatedWanUsage(
    period: 'daily' | 'weekly' | 'monthly',
    wanIds?: string[],
  ): Promise<AggregatedWanUsage[]> {
    try {
      const now = new Date();
      let startDate: Date;

      // Determine the start date based on the period
      switch (period) {
        case 'daily':
          startDate = startOfDay(now);
          break;
        case 'weekly':
          startDate = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
          break;
        case 'monthly':
          startDate = startOfMonth(now);
          break;
        default:
          startDate = startOfDay(now);
      }

      // Build where clause for filtering
      const where: any = {
        snapshotDate: {
          gte: startDate,
        },
      };

      if (wanIds && wanIds.length > 0) {
        where.wanId = {
          in: wanIds,
        };
      }

      // Get WAN usage records from database
      const wanUsageRecords = await this.prismaService.wanUsage.findMany({
        where,
        include: {
          wan: {
            select: {
              wanName: true,
            },
          },
        },
      });

      // Group by WAN ID
      const groupedByWan: Record<string, any[]> = {};

      for (const record of wanUsageRecords) {
        if (!groupedByWan[record.wanId]) {
          groupedByWan[record.wanId] = [];
        }

        groupedByWan[record.wanId].push(record);
      }

      // Calculate aggregated values for each WAN
      const result: AggregatedWanUsage[] = [];

      for (const [wanId, records] of Object.entries(groupedByWan)) {
        // Sort records by snapshot date
        records.sort(
          (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime(),
        );

        // Get the first and last record for this period
        const firstRecord = records[0];
        const lastRecord = records[records.length - 1];

        // Calculate total bytes used in this period
        // We use the difference between the last and first record
        const totalBytes = Number(lastRecord.bytes) - Number(firstRecord.bytes);
        const maxBytes = Number(lastRecord.maxBytes);
        const usagePercentage =
          maxBytes > 0 ? (totalBytes / maxBytes) * 100 : 0;

        // Format bytes for display
        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0 Bytes';
          const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
          const i = Math.floor(Math.log(bytes) / Math.log(1024));
          return (
            parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
          );
        };

        result.push({
          wanId,
          wanName: firstRecord.wan?.wanName || 'Unknown WAN',
          totalBytes,
          maxBytes,
          usagePercentage,
          formattedTotalBytes: formatBytes(totalBytes),
          formattedMaxBytes: formatBytes(maxBytes),
          periodStart: firstRecord.snapshotDate,
          periodEnd: lastRecord.snapshotDate,
        });
      }

      return result;
    } catch (error) {
      this.logger.error(chalk.red('Failed to get aggregated WAN usage'), error);
      throw new Error(`Failed to get aggregated WAN usage: ${error.message}`);
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
