import { Injectable, Logger } from '@nestjs/common';
import {
  endOfDay,
  endOfMonth,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AggregatedWanUsage,
  SnakeWaysWanUsageService,
} from '../snake-ways/wan-usage/snake-ways-wan-usage.service';
import {
  WanChartMetadataDto,
  WanUsageChartDataDto,
  WanUsageChartResponseDto,
} from './dto';
import { WanUsageEntity } from './entities/wan-usage.entity';
const chalk = require('chalk');

@Injectable()
export class WanUsageService {
  private readonly logger = new Logger(WanUsageService.name);

  constructor(
    private readonly snakeWaysWanUsageService: SnakeWaysWanUsageService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Get WAN usage entities from the database with filtering options
   * @param options Filter options for WAN usage
   * @returns Array of WanUsageEntity objects
   */
  async getWanUsageEntities(options?: {
    wanId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<WanUsageEntity[]> {
    try {
      const { wanId, startDate, endDate, limit = 100 } = options || {};

      // Build where clause for filtering
      const where: any = {};

      if (wanId) {
        where.wanId = wanId;
      }

      if (startDate || endDate) {
        where.snapshotDate = {};

        if (startDate) {
          where.snapshotDate.gte = startDate;
        }

        if (endDate) {
          where.snapshotDate.lte = endDate;
        }
      }

      // Get WAN usage records from database
      const wanUsageRecords = await this.prismaService.wanUsage.findMany({
        where,
        orderBy: {
          snapshotDate: 'desc',
        },
        take: limit,
        include: {
          wan: {
            select: {
              wanName: true,
            },
          },
        },
      });

      // Transform to entities
      return wanUsageRecords.map(
        (record) =>
          new WanUsageEntity({
            ...record,
            wanName: record.wan?.wanName,
          }),
      );
    } catch (error) {
      this.logger.error(chalk.red('Failed to get WAN usage entities'), error);
      throw new Error(`Failed to get WAN usage entities: ${error.message}`);
    }
  }

  /**
   * Get WAN usage data for charts with metadata
   * @param period The period type for data points (daily, weekly, monthly)
   * @param wanIds Array of WAN IDs to include in the chart data
   * @returns Object containing chart data points and metadata
   */
  async getWanUsageChartData(
    period: 'daily' | 'weekly' | 'monthly',
    wanIds?: string[],
  ): Promise<WanUsageChartResponseDto> {
    try {
      const now = new Date();
      let startDate: Date;
      let numberOfPoints: number;
      let intervalType: 'day' | 'week' | 'month';

      // Determine the start date and number of data points based on the period
      switch (period) {
        case 'daily':
          // For daily, show last 7 days with daily points
          startDate = subDays(now, 6); // 6 days ago + today = 7 days
          numberOfPoints = 7;
          intervalType = 'day';
          break;
        case 'weekly':
          // For weekly, show last 4 weeks with weekly points
          startDate = subDays(now, 28); // 4 weeks (28 days)
          numberOfPoints = 4;
          intervalType = 'week';
          break;
        case 'monthly':
          // For monthly, show last 6 months with monthly points
          startDate = subMonths(now, 5); // 5 months ago + current month = 6 months
          numberOfPoints = 6;
          intervalType = 'month';
          break;
        default:
          startDate = subDays(now, 6);
          numberOfPoints = 7;
          intervalType = 'day';
      }

      // Make sure startDate is at the beginning of the day/week/month
      startDate = startOfDay(startDate);

      // Build where clause for filtering
      const where: any = {
        snapshotDate: {
          gte: startDate,
        },
      };

      // Only fetch data for the specified WANs
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
        orderBy: {
          snapshotDate: 'asc',
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

      // Initialize time points based on the period
      const timePoints: Date[] = [];

      // Generate time points based on the period
      for (let i = 0; i < numberOfPoints; i++) {
        switch (intervalType) {
          case 'day':
            timePoints.push(subDays(now, numberOfPoints - 1 - i));
            break;
          case 'week':
            timePoints.push(subDays(now, (numberOfPoints - 1 - i) * 7));
            break;
          case 'month':
            timePoints.push(subMonths(now, numberOfPoints - 1 - i));
            break;
        }
      }

      // Create a map of WAN IDs to their names
      const wanNames: Record<string, string> = {};

      // If specific WANs were requested, fetch their names from the database
      if (wanIds && wanIds.length > 0) {
        const wans = await this.prismaService.wan.findMany({
          where: { id: { in: wanIds } },
          select: { id: true, wanName: true },
        });

        // Add all requested WANs to the names map
        for (const wan of wans) {
          wanNames[wan.id] = wan.wanName || `WAN ${wan.id.substring(0, 8)}`;
        }
      } else {
        // If no specific WANs were requested, include all WANs with data
        for (const wanId in groupedByWan) {
          const records = groupedByWan[wanId];
          if (records.length > 0) {
            wanNames[wanId] =
              records[0].wan?.wanName || `WAN ${wanId.substring(0, 8)}`;
          }
        }
      }

      // Initialize chart data with dates
      const chartData: WanUsageChartDataDto[] = timePoints.map((date) => ({
        date,
      }));

      // Initialize metadata for each WAN
      const metadata: WanChartMetadataDto[] = [];

      // Process all WANs in wanNames
      for (const [wanId, wanName] of Object.entries(wanNames)) {
        const records = groupedByWan[wanId] || [];
        let totalBytes = 0;

        // Initialize all data points with zero for this WAN
        for (let i = 0; i < chartData.length; i++) {
          chartData[i][wanName] = 0;
        }

        // If we have records for this WAN, process them
        if (records.length >= 2) {
          // Process data based on the period
          for (let i = 0; i < timePoints.length; i++) {
            const currentDate = timePoints[i];
            let periodStart: Date;
            let periodEnd: Date;

            switch (intervalType) {
              case 'day':
                // Daily data point (one day)
                periodStart = startOfDay(currentDate);
                periodEnd = endOfDay(currentDate);
                break;
              case 'week':
                // Weekly data point (7 days)
                periodStart = startOfDay(currentDate);
                periodEnd = endOfDay(subDays(currentDate, -6)); // Current day + 6 more days = 1 week
                break;
              case 'month':
                // Monthly data point
                periodStart = startOfMonth(currentDate);
                periodEnd = endOfMonth(currentDate);
                break;
            }

            // Find records within this period
            const periodRecords = records.filter(
              (r) =>
                r.snapshotDate >= periodStart && r.snapshotDate <= periodEnd,
            );

            if (periodRecords.length >= 2) {
              // Calculate usage for this period
              const firstRecord = periodRecords[0];
              const lastRecord = periodRecords[periodRecords.length - 1];

              const isWithinSameMonth = isSameMonth(
                firstRecord.snapshotDate,
                lastRecord.snapshotDate,
              );

              if (period === 'weekly' && !isWithinSameMonth) {
                const recordsOfStartMonth = periodRecords
                  .filter((record) =>
                    isSameMonth(record.snapshotDate, firstRecord.snapshotDate),
                  )
                  .sort(
                    (a, b) =>
                      a.snapshotDate.getTime() - b.snapshotDate.getTime(),
                  );
                const recordsOfEndMonth = periodRecords
                  .filter((record) =>
                    isSameMonth(record.snapshotDate, lastRecord.snapshotDate),
                  )
                  .sort(
                    (a, b) =>
                      a.snapshotDate.getTime() - b.snapshotDate.getTime(),
                  );

                const firstRecordOfStartMonth = recordsOfStartMonth[0];
                const firstRecordOfEndMonth = recordsOfEndMonth[0];
                const lastRecordOfStartMonth =
                  recordsOfStartMonth[recordsOfStartMonth.length - 1];
                const lastRecordOfEndMonth =
                  recordsOfEndMonth[recordsOfEndMonth.length - 1];

                const firstRecordOfStartMonthBytes =
                  typeof firstRecordOfStartMonth.bytes === 'bigint'
                    ? firstRecordOfStartMonth.bytes
                    : BigInt(firstRecordOfStartMonth.bytes || 0);
                const firstRecordOfEndMonthBytes =
                  typeof firstRecordOfEndMonth.bytes === 'bigint'
                    ? firstRecordOfEndMonth.bytes
                    : BigInt(firstRecordOfEndMonth.bytes || 0);
                const lastRecordOfStartMonthBytes =
                  typeof lastRecordOfStartMonth.bytes === 'bigint'
                    ? lastRecordOfStartMonth.bytes
                    : BigInt(lastRecordOfStartMonth.bytes || 0);
                const lastRecordOfEndMonthBytes =
                  typeof lastRecordOfEndMonth.bytes === 'bigint'
                    ? lastRecordOfEndMonth.bytes
                    : BigInt(lastRecordOfEndMonth.bytes || 0);

                const firstMonthUsage = Math.abs(
                  Number(
                    lastRecordOfStartMonthBytes - firstRecordOfStartMonthBytes,
                  ),
                );
                const lastMonthUsage = Math.abs(
                  Number(
                    lastRecordOfEndMonthBytes - firstRecordOfEndMonthBytes,
                  ),
                );
                const totalUsage = firstMonthUsage + lastMonthUsage;
                chartData[i][wanName] = totalUsage;
                totalBytes += totalUsage;
              } else {
                // Keep as BigInt for calculation to avoid precision loss
                const lastBytes =
                  typeof lastRecord.bytes === 'bigint'
                    ? lastRecord.bytes
                    : BigInt(lastRecord.bytes);
                const firstBytes =
                  typeof firstRecord.bytes === 'bigint'
                    ? firstRecord.bytes
                    : BigInt(firstRecord.bytes);
                const totalUsage = Math.abs(Number(lastBytes - firstBytes));

                // Add usage to chart data with WAN name as key
                chartData[i][wanName] = totalUsage;
                totalBytes += totalUsage;
              }
            }
          }
        }

        // Add metadata for this WAN (even if it has no data)
        metadata.push({
          name: wanName,
          totalBytes,
          formattedTotalBytes: this.formatBytes(totalBytes),
        });
      }

      const response: WanUsageChartResponseDto = {
        data: chartData,
        metadata: metadata,
      };

      return response;
    } catch (error) {
      this.logger.error(chalk.red('Failed to get WAN usage chart data'), error);
      throw new Error(`Failed to get WAN usage chart data: ${error.message}`);
    }
  }

  /**
   * Attempt to restart Snake Ways polling if it has stopped
   * @returns Object indicating if polling was restarted and a status message
   */
  async restartPolling(): Promise<{ restarted: boolean; message: string }> {
    try {
      this.logger.log(
        chalk.cyan(
          'Attempting to restart Snake Ways WAN Usage service polling',
        ),
      );

      const wasRestarted =
        await this.snakeWaysWanUsageService.restartPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold(
            'Snake Ways WAN Usage service polling restarted successfully',
          ),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways WAN service polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message:
            'WAN Usage service polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold(
          'Failed to restart Snake Ways WAN Usage service polling',
        ),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart WAN Usage service polling: ${error.message}`,
      };
    }
  }

  /**
   * Format bytes to human-readable string
   * @param bytes The number of bytes to format
   * @returns Formatted string (e.g., "1.5 GB")
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get aggregated WAN usage data
   * @param period The period type (daily, weekly, monthly)
   * @param wanIds Optional array of WAN IDs to filter by
   */
  async getAggregatedData(
    period: 'daily' | 'weekly' | 'monthly',
    wanIds?: string[],
  ): Promise<AggregatedWanUsage[]> {
    this.logger.debug(`Getting ${period} aggregated data for WANs:`, wanIds);
    return this.snakeWaysWanUsageService.getAggregatedWanUsage(period, wanIds);
  }
}
