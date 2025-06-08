import { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
const chalk = require('chalk');

/**
 * LAN Usage data structure from Snake Ways API
 */
export class LanUsageData {
  /** Bytes used by this LAN */
  Bytes: number;
  /** End time as unix timestamp (0 if still active) */
  Endtime: number;
  /** LAN ID (32 byte hex string) */
  LanID: string;
  /** LAN name */
  LanName: string;
  /** Start time as unix timestamp */
  Starttime: number;
  /** WAN ID (32 byte hex string) */
  WanID: string;
  /** WAN name */
  WanName: string;
}

/**
 * Aggregated LAN usage data structure
 */
export interface AggregatedLanUsage {
  /** Period start date */
  startDate: Date;
  /** Period end date */
  endDate: Date;
  /** LAN name */
  lanName: string;
  /** WAN name */
  wanName: string;
  /** LAN ID */
  lanId: string;
  /** WAN ID */
  wanId: string;
  /** Bytes used in this period */
  bytes: number;
  /** Formatted bytes used (human-readable) */
  formattedBytes: string;
  /** Usage percentage within this collection */
  usagePercentage?: number;
}

@Injectable()
export class SnakeWaysLanUsageService
  extends SnakeWaysBaseService
  implements OnModuleInit, OnModuleDestroy
{
  private lanUsagePollingSubscription: Subscription;
  private lanUsageDataStream$: Observable<{ lanusage: LanUsageData[] } | null>;
  private pollingActive = false;
  private pollingIntervalInMins: number;

  constructor(
    protected readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super(httpService);
    // Override logger with this class name
    Object.defineProperty(this, 'logger', {
      value: new Logger(SnakeWaysLanUsageService.name),
    });

    this.pollingIntervalInMins =
      this.configService.get<number>('SNAKE_WAYS_LAN_USAGE_POLLING_INTERVAL') ||
      60;
  }

  async onModuleInit() {
    // Start polling LAN usage on module init
    this.startPollingLanUsage();
  }

  private startPollingLanUsage() {
    if (this.pollingActive) {
      this.logger.log(
        chalk.yellow('LAN Usage Polling is already active, not starting again'),
      );
      return;
    }

    this.pollingActive = true;

    this.logger.log(
      chalk.blue.bold(
        `Starting to poll LAN usage from Snake Ways every ${this.pollingIntervalInMins} minutes`,
      ),
    );

    this.lanUsageDataStream$ = this.createPollingObservable<{
      lanusage: LanUsageData[];
    }>('/lanusage', this.pollingIntervalInMins * 60000); // Convert minutes to milliseconds

    this.lanUsagePollingSubscription = this.lanUsageDataStream$.subscribe({
      next: async (data) => {
        if (data?.lanusage) {
          await this.syncLanUsageWithDatabase(data.lanusage);
        }
      },
      error: (error) => {
        // This should rarely be called since we're catching errors in the observable
        this.logger.error(
          chalk.red.bold('Unexpected error in LAN usage polling subscription'),
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
            'Polling LAN usage from Snake Ways completed or stopped due to max failures',
          ),
        );
        this.pollingActive = false;
      },
    });
  }

  public async restartPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(
        chalk.blue.bold('Attempting to restart LAN usage polling'),
      );
      // Reset the service availability status
      this.resetServiceAvailability();
      // Reset the consecutive failures counter for this endpoint
      this.resetConsecutiveFailures('/lanusage');
      // Start polling again
      this.startPollingLanUsage();
      return true;
    }
    return false;
  }

  private async syncLanUsageWithDatabase(lanUsageData: LanUsageData[]) {
    try {
      this.logger.log(
        chalk.cyan(
          `Syncing ${chalk.bold(lanUsageData.length)} LAN usage records from Snake Ways`,
        ),
      );

      const today = new Date();
      const startOfToday = startOfDay(today);

      // Process each LAN usage record
      for (const usage of lanUsageData) {
        // Lookup the LAN and WAN by their Snake Ways IDs
        const lan = await this.prismaService.lan.findUnique({
          where: { lanId: usage.LanID },
        });

        if (!lan) {
          this.logger.warn(
            chalk.yellow(
              `LAN with ID ${usage.LanID} not found in database, skipping usage record`,
            ),
          );
          continue;
        }

        // Find the WAN by ID from Snake Ways
        const wan = await this.prismaService.wan.findUnique({
          where: { id: usage.WanID },
        });

        if (!wan) {
          this.logger.warn(
            chalk.yellow(
              `WAN with ID ${usage.WanID} not found in database, skipping usage record`,
            ),
          );
          continue;
        }

        // Check if we already have a snapshot for this LAN-WAN combination today
        const existingSnapshot = await this.prismaService.lanUsage.findFirst({
          where: {
            lanId: lan.id,
            wanId: wan.id,
            snapshotDate: {
              gte: startOfToday,
            },
          },
        });

        // Convert Unix timestamps to JavaScript Date objects
        const startTime = new Date(usage.Starttime * 1000);
        const endTime =
          usage.Endtime === 0 ? null : new Date(usage.Endtime * 1000);

        if (!existingSnapshot) {
          // Create a new snapshot
          await this.prismaService.lanUsage.create({
            data: {
              lanId: lan.id,
              wanId: wan.id,
              bytes: BigInt(usage.Bytes),
              startTime,
              endTime,
              snapshotDate: today,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          this.logger.log(
            chalk.green.bold(
              `Created LAN usage snapshot for ${usage.LanName} on ${usage.WanName}`,
            ),
          );
        } else {
          // Update the existing snapshot
          await this.prismaService.lanUsage.update({
            where: { id: existingSnapshot.id },
            data: {
              bytes: BigInt(usage.Bytes),
              startTime,
              endTime,
              updatedAt: new Date(),
            },
          });

          this.logger.log(
            chalk.green(
              `Updated LAN usage snapshot for ${usage.LanName} on ${usage.WanName}`,
            ),
          );
        }
      }

      this.logger.log(
        chalk.green.bold(`LAN usage sync completed successfully`),
      );
    } catch (error) {
      this.logger.error('Failed to sync LAN usage with database', error);
    }
  }

  /**
   * Get LAN usage for the specified parameters
   * @param days Optional - returns only records for last x days, default 7 days
   * @param lanId Optional - returns only records for LAN with this ID
   * @param wanId Optional - returns only records for WAN with this ID
   */
  async getLanUsage(
    days?: number,
    lanId?: string,
    wanId?: string,
  ): Promise<LanUsageData[]> {
    try {
      // Construct query parameters
      const params: Record<string, any> = {};
      if (days !== undefined) params.days = days;
      if (lanId) params.lanid = lanId;
      if (wanId) params.wanid = wanId;

      // Construct config with query parameters
      const config: AxiosRequestConfig = { params };

      // Make the API request
      const response = await this.get<{ lanusage: LanUsageData[] }>(
        '/lanusage',
        config,
      );

      return response?.lanusage || [];
    } catch (error) {
      this.logger.error('Failed to get LAN usage data', error);
      throw new Error(`Failed to get LAN usage data: ${error.message}`);
    }
  }

  /**
   * Force an immediate synchronization with Snake Ways
   */
  async forceSync(): Promise<number> {
    this.logger.log(
      chalk.yellow.bold(
        'Manually triggering LAN usage synchronization with Snake Ways',
      ),
    );
    try {
      // Fetch latest LAN usage from Snake Ways
      const response = await this.get<{ lanusage: LanUsageData[] }>(
        '/lanusage',
      );

      if (!response?.lanusage) {
        this.logger.warn(
          chalk.yellow(
            'No LAN usage records returned from Snake Ways during force sync',
          ),
        );
        return 0;
      }

      // Perform synchronization
      await this.syncLanUsageWithDatabase(response.lanusage);

      this.logger.log(
        chalk.green.bold(
          `Force sync completed: ${chalk.white(response.lanusage.length)} LAN usage records synchronized`,
        ),
      );

      return response.lanusage.length;
    } catch (error) {
      this.logger.error(chalk.red.bold('Force sync failed'), error);
      throw new Error(`Force synchronization failed: ${error.message}`);
    }
  }

  /**
   * Get aggregated LAN usage data for the specified period
   * @param period Period type (daily, weekly, monthly)
   * @param lanIds Optional array of LAN IDs to include
   * @param wanIds Optional array of WAN IDs to include
   */
  async getAggregatedLanUsage(
    period: 'daily' | 'weekly' | 'monthly',
    lanIds?: string[],
    wanIds?: string[],
  ): Promise<AggregatedLanUsage[]> {
    try {
      // Determine date range based on period
      const now = new Date();
      let startDate: Date;
      let queryDays: number;

      switch (period) {
        case 'daily':
          startDate = startOfDay(subDays(now, 6)); // Last 7 days
          queryDays = 7;
          break;
        case 'weekly':
          startDate = startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 }); // Last 4 weeks
          queryDays = 28;
          break;
        case 'monthly':
          startDate = startOfMonth(subMonths(now, 5)); // Last 6 months
          queryDays = 180;
          break;
        default:
          startDate = startOfDay(subDays(now, 6));
          queryDays = 7;
      }

      // Get raw usage data
      let rawData = await this.getLanUsage(queryDays);

      // Filter by LAN IDs if specified
      if (lanIds && lanIds.length > 0) {
        rawData = rawData.filter((usage) => lanIds.includes(usage.LanID));
      }

      // Filter by WAN IDs if specified
      if (wanIds && wanIds.length > 0) {
        rawData = rawData.filter((usage) => wanIds.includes(usage.WanID));
      }

      // Process data based on period
      const aggregatedData: AggregatedLanUsage[] = [];
      const lanWanCombinations = new Map<string, number>();
      let totalBytes = 0;

      // Group by period and LAN-WAN combination
      rawData.forEach((usage) => {
        const usageStartDate = new Date(usage.Starttime * 1000);
        const usageEndDate =
          usage.Endtime === 0 ? new Date() : new Date(usage.Endtime * 1000);

        // Skip if outside our date range
        if (usageStartDate < startDate) {
          return;
        }

        let periodStartDate: Date;
        let periodEndDate: Date;

        // Determine period boundaries based on the usage start date
        switch (period) {
          case 'daily':
            periodStartDate = startOfDay(usageStartDate);
            periodEndDate = endOfDay(usageStartDate);
            break;
          case 'weekly':
            periodStartDate = startOfWeek(usageStartDate, { weekStartsOn: 1 });
            periodEndDate = endOfWeek(usageStartDate, { weekStartsOn: 1 });
            break;
          case 'monthly':
            periodStartDate = startOfMonth(usageStartDate);
            periodEndDate = endOfMonth(usageStartDate);
            break;
        }

        // Create a unique key for this period + LAN + WAN combination
        const key = `${format(periodStartDate, 'yyyy-MM-dd')}_${usage.LanID}_${usage.WanID}`;

        // Add to existing entry or create a new one
        if (lanWanCombinations.has(key)) {
          const existingIndex = lanWanCombinations.get(key);
          if (existingIndex !== undefined) {
            aggregatedData[existingIndex].bytes += usage.Bytes;
            totalBytes += usage.Bytes;
          }
        } else {
          const newEntry: AggregatedLanUsage = {
            startDate: periodStartDate,
            endDate: periodEndDate,
            lanName: usage.LanName,
            wanName: usage.WanName,
            lanId: usage.LanID,
            wanId: usage.WanID,
            bytes: usage.Bytes,
            formattedBytes: this.formatBytes(usage.Bytes),
          };

          lanWanCombinations.set(key, aggregatedData.length);
          aggregatedData.push(newEntry);
          totalBytes += usage.Bytes;
        }
      });

      // Calculate percentages based on total bytes
      if (totalBytes > 0) {
        aggregatedData.forEach((entry) => {
          entry.usagePercentage = (entry.bytes / totalBytes) * 100;
        });
      }

      // Sort by date and then by bytes used (descending)
      return aggregatedData.sort((a, b) => {
        // First sort by date
        const dateDiff = a.startDate.getTime() - b.startDate.getTime();
        if (dateDiff !== 0) return dateDiff;

        // Then by bytes (descending)
        return b.bytes - a.bytes;
      });
    } catch (error) {
      this.logger.error('Failed to get aggregated LAN usage data', error);
      throw new Error(
        `Failed to get aggregated LAN usage data: ${error.message}`,
      );
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onModuleDestroy() {
    if (this.lanUsagePollingSubscription) {
      this.logger.log(chalk.blue('Stopping LAN usage polling'));
      this.lanUsagePollingSubscription.unsubscribe();
      this.pollingActive = false;
    }
  }
}
