import { Injectable, Logger } from '@nestjs/common';
import {
  SnakeWaysWanUsageService,
  AggregatedWanUsage,
} from '../snake-ways/wan-usage/snake-ways-wan-usage.service';
import { WanUsageEntity } from './entities/wan-usage.entity';
import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfHour,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { subHours } from 'date-fns';
import { endOfHour } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
const chalk = require('chalk');

/**
 * Type for chart data point
 */
export interface WanUsageChartData {
  date: Date;
  // Dynamic keys for each WAN name with usage values
  [wanName: string]: Date | number;
}

/**
 * Type for metadata about each WAN in the chart
 */
export interface WanChartMetadata {
  name: string;
  totalBytes: number;
  formattedTotalBytes: string;
  color?: string; // Optional color for the chart
}

@Injectable()
export class WanUsageService {
  private readonly logger = new Logger(WanUsageService.name);

  constructor(
    private readonly snakeWaysWanUsageService: SnakeWaysWanUsageService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Get WAN usage entities with filtering options
   */
  async getWanUsageEntities(options?: {
    wanId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<WanUsageEntity[]> {
    this.logger.debug('Getting WAN usage entities with options:', options);
    return this.snakeWaysWanUsageService.getWanUsageEntities(options);
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
  ): Promise<{ data: WanUsageChartData[]; metadata: WanChartMetadata[] }> {
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

      // Initialize data points based on the period
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
      const chartData: WanUsageChartData[] = timePoints.map((date) => ({
        date,
      }));

      // Initialize metadata for each WAN
      const metadata: WanChartMetadata[] = [];

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

              // Keep as BigInt for calculation to avoid precision loss
              const lastBytes =
                typeof lastRecord.bytes === 'bigint'
                  ? lastRecord.bytes
                  : BigInt(lastRecord.bytes);
              const firstBytes =
                typeof firstRecord.bytes === 'bigint'
                  ? firstRecord.bytes
                  : BigInt(firstRecord.bytes);
              const usageBigInt = lastBytes - firstBytes;

              // Convert to Number only at the end
              const usage = Number(usageBigInt);
              const safeUsage = usage < 0 ? 0 : usage; // Prevent negative usage

              // Add usage to chart data with WAN name as key
              chartData[i][wanName] = safeUsage;
              totalBytes += safeUsage;
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

      return { data: chartData, metadata };
    } catch (error) {
      this.logger.error(chalk.red('Failed to get WAN usage chart data'), error);
      throw new Error(`Failed to get WAN usage chart data: ${error.message}`);
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
