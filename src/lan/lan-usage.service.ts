import { endOfDay, isSameMonth, startOfDay } from 'date-fns';
import { Injectable, Logger } from '@nestjs/common';
import { LanUsageEntity } from './entities/lan-usage.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { LanInterfaceDto, LanWithUsageDto, NetworkInterfaceDto } from './dto';
import { InterfaceType } from '@prisma/client';
import { SnakeWaysLanUsageService } from 'src/snake-ways/lan-usage/snake-ways-lan-usage.service';
const chalk = require('chalk');

/**
 * LAN with usage data type
 */
export interface LanWithUsage {
  id: string;
  lanId: string;
  lanName: string;
  ipAddress: string;
  subnetmask: string;
  dhcp: string;
  interfaces: LanInterfaceDto[];
  usageData: LanUsageEntity[];
  totalBytes: number;
  formattedTotalBytes: string;
}

@Injectable()
export class LanUsageService {
  private readonly logger = new Logger(LanUsageService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly snakeWaysLanUsageService: SnakeWaysLanUsageService,
  ) {}

  /**
   * Get LAN usage entities from the database with filtering options
   * @param options Filter options for LAN usage
   * @returns Array of LanUsageEntity objects
   */
  async getLanUsageEntities(options?: {
    lanId?: string;
    wanId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LanUsageEntity[]> {
    try {
      const { lanId, wanId, startDate, endDate, limit = 100 } = options || {};

      // Build where clause for filtering
      const where: any = {};

      if (lanId) {
        where.lanId = lanId;
      }

      if (wanId) {
        where.wanId = wanId;
      }

      if (startDate || endDate) {
        where.snapshotDate = {};

        if (startDate) {
          where.snapshotDate.gte = startOfDay(startDate);
        }

        if (endDate) {
          where.snapshotDate.lte = endOfDay(endDate);
        }
      }

      // Get LAN usage records from database
      const lanUsageRecords = await this.prismaService.lanUsage.findMany({
        where,
        orderBy: {
          snapshotDate: 'asc',
        },
        take: limit,
        include: {
          lan: {
            select: {
              lanName: true,
            },
          },
          wan: {
            select: {
              wanName: true,
            },
          },
        },
      });

      // Group records by LAN ID for usage calculation
      const groupedByLan: Record<string, any[]> = {};
      for (const record of lanUsageRecords) {
        if (!groupedByLan[record.lanId]) {
          groupedByLan[record.lanId] = [];
        }
        groupedByLan[record.lanId].push(record);
      }

      // Calculate usage for each LAN and enhance records
      const enhancedRecords: any[] = [];

      for (const [lanId, lanRecords] of Object.entries(groupedByLan)) {
        if (lanRecords.length >= 2) {
          // Sort records chronologically to ensure proper order
          lanRecords.sort(
            (a, b) =>
              new Date(a.snapshotDate).getTime() -
              new Date(b.snapshotDate).getTime(),
          );

          const lastRecord = lanRecords[lanRecords.length - 1];

          // Calculate total usage by processing all records chronologically
          let accumulatedUsage = 0;

          // Process records in chronological order to track changes
          for (let i = 1; i < lanRecords.length; i++) {
            const prevRecord = lanRecords[i - 1];
            const currentRecord = lanRecords[i];

            // Calculate period usage (what happened between prev and current record)
            const prevBytes =
              typeof prevRecord.bytes === 'bigint'
                ? prevRecord.bytes
                : BigInt(prevRecord.bytes || 0);
            const currentBytes =
              typeof currentRecord.bytes === 'bigint'
                ? currentRecord.bytes
                : BigInt(currentRecord.bytes || 0);

            // Usage = current - prev (since bytes accumulate over time)
            const periodUsageBigInt = currentBytes - prevBytes;
            const periodUsage = Number(periodUsageBigInt);

            // Only accumulate positive values (actual usage)
            if (periodUsage > 0) {
              accumulatedUsage += periodUsage;
            }
          }

          // Add the last record with calculated usage info
          enhancedRecords.push({
            ...lastRecord,
            calculatedUsage: accumulatedUsage,
            formattedUsage: this.formatBytes(accumulatedUsage),
          });
        } else if (lanRecords.length === 1) {
          // If only one record, add it without usage calculation
          const record = lanRecords[0];
          enhancedRecords.push({
            ...record,
            calculatedUsage: 0,
            formattedUsage: '0 Bytes',
          });
        } else {
          enhancedRecords.push({
            ...lanRecords[0],
            calculatedUsage: 0,
            formattedUsage: '0 Bytes',
          });
        }
      }

      // Transform to entities and sort by LAN name
      return enhancedRecords
        .sort((a, b) =>
          (a.lan?.lanName || '').localeCompare(b.lan?.lanName || ''),
        )
        .map(
          (record) =>
            new LanUsageEntity({
              ...record,
              lanName: record.lan?.lanName,
              wanName: record.wan?.wanName,
            }),
        );
    } catch (error) {
      this.logger.error(chalk.red('Failed to get LAN usage entities'), error);
      throw new Error(`Failed to get LAN usage entities: ${error.message}`);
    }
  }

  /**
   * Get LANs with their usage data based on filters
   * @param options Filter options for LAN with usage data
   * @returns Array of LAN objects with associated usage data
   */
  async getLansWithUsage(options?: {
    wanId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<LanWithUsageDto[]> {
    try {
      const { wanId, startDate, endDate } = options || {};

      // First get all LANs, optionally filtered by WAN ID (via their usage records)
      const lanWhereClause: any = {};

      if (wanId) {
        lanWhereClause.usageRecords = {
          some: {
            wanId: wanId,
          },
        };
      }

      const lans = await this.prismaService.lan.findMany({
        where: lanWhereClause,
        include: {
          interfaces: {
            include: {
              // This will include the NetworkInterface if we find it in the database
              // The relationship is not enforced by a foreign key, so we do a manual lookup
            },
          },
        },
      });

      // Get all network interfaces to properly link them
      const interfaces = await this.prismaService.networkInterface.findMany();
      const interfacesMap = new Map(
        interfaces.map((iface) => [iface.interfaceId, iface]),
      );

      // Build result array
      const result: LanWithUsageDto[] = [];

      // For each LAN, get its usage data with the given filters
      for (const lan of lans) {
        const usageWhere: any = {
          lanId: lan.id,
        };

        if (wanId) {
          usageWhere.wanId = wanId;
        }

        if (startDate || endDate) {
          usageWhere.snapshotDate = {};

          if (startDate) {
            usageWhere.snapshotDate.gte = startOfDay(startDate);
          }

          if (endDate) {
            usageWhere.snapshotDate.lte = endOfDay(endDate);
          }
        }

        // Get usage records for this LAN
        const usageRecords = await this.prismaService.lanUsage.findMany({
          where: usageWhere,
          orderBy: {
            snapshotDate: 'asc',
          },
          include: {
            wan: {
              select: {
                wanName: true,
              },
            },
          },
        });

        // Calculate usage bytes: last record - first record
        let totalBytes = 0;
        let enhancedUsageRecords: any[] = [];

        if (usageRecords.length >= 2) {
          // Sort records chronologically to ensure proper order
          usageRecords.sort(
            (a, b) =>
              new Date(a.snapshotDate).getTime() -
              new Date(b.snapshotDate).getTime(),
          );

          const lastRecord = usageRecords[usageRecords.length - 1];

          // Calculate total usage by processing all records chronologically
          let accumulatedUsage = 0;

          // Process records in chronological order to track changes
          for (let i = 1; i < usageRecords.length; i++) {
            const prevRecord = usageRecords[i - 1];
            const currentRecord = usageRecords[i];

            // Calculate period usage (what happened between prev and current record)
            const prevBytes =
              typeof prevRecord.bytes === 'bigint'
                ? prevRecord.bytes
                : BigInt(prevRecord.bytes || 0);
            const currentBytes =
              typeof currentRecord.bytes === 'bigint'
                ? currentRecord.bytes
                : BigInt(currentRecord.bytes || 0);

            // Usage = current - prev (since bytes accumulate over time)
            const periodUsageBigInt = currentBytes - prevBytes;
            const periodUsage = Number(periodUsageBigInt);

            // Only accumulate positive values (actual usage)
            if (periodUsage > 0) {
              accumulatedUsage += periodUsage;
            }
          }

          totalBytes = accumulatedUsage;

          // Add enhanced record with calculated total usage
          enhancedUsageRecords.push({
            ...lastRecord,
            calculatedUsage: totalBytes,
            formattedUsage: this.formatBytes(totalBytes),
          });
        } else if (usageRecords.length === 1) {
          // If only one record, add it without usage calculation
          const record = usageRecords[0];
          enhancedUsageRecords.push({
            ...record,
            calculatedUsage: 0,
            formattedUsage: '0 Bytes',
          });
          totalBytes = 0;
        } else {
          totalBytes = 0;
        }

        // Transform to LanUsageEntity objects
        const usageEntities = enhancedUsageRecords.map(
          (record) =>
            new LanUsageEntity({
              ...record,
              lanName: lan.lanName,
              wanName: record.wan?.wanName,
            }),
        );

        // Map interfaces to DTOs with additional network interface data
        const interfaceDtos: LanInterfaceDto[] = lan.interfaces.map((iface) => {
          // Find the network interface from our map
          const networkInterface = interfacesMap.get(iface.interfaceId);

          const lanInterface: LanInterfaceDto = {
            id: iface.id,
            lanId: iface.lanId,
            interfaceId: iface.interfaceId,
          };

          // Add the network interface if found
          if (networkInterface) {
            lanInterface.interface = {
              id: networkInterface.id,
              interfaceId: networkInterface.interfaceId,
              name: networkInterface.name,
              status: networkInterface.status,
              type: this.mapInterfaceTypeToNumber(networkInterface.type),
            };
          }

          return lanInterface;
        });

        // Add to result array
        result.push({
          id: lan.id,
          lanId: lan.id,
          lanName: lan.lanName,
          ipAddress: lan.ipAddress,
          subnetmask: lan.subnetmask,
          dhcp: lan.dhcp,
          interfaces: interfaceDtos,
          usageData: usageEntities,
          totalBytes: totalBytes,
          formattedTotalBytes: this.formatBytes(totalBytes),
        });
      }

      // Sort by LAN name
      return result.sort((a, b) => a.lanName.localeCompare(b.lanName));
    } catch (error) {
      this.logger.error(chalk.red('Failed to get LANs with usage data'), error);
      throw new Error(`Failed to get LANs with usage data: ${error.message}`);
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
          'Attempting to restart Snake Ways LAN Usage service polling',
        ),
      );

      const wasRestarted =
        await this.snakeWaysLanUsageService.restartPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold(
            'Snake Ways LAN Usage service polling restarted successfully',
          ),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways LAN Usage service polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message:
            'LAN Usage service polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold(
          'Failed to restart Snake Ways LAN Usage service polling',
        ),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart LAN Usage service polling: ${error.message}`,
      };
    }
  }

  /**
   * Maps the InterfaceType enum to its corresponding number value
   * @param type The InterfaceType enum value
   * @returns The numeric representation of the interface type
   */
  private mapInterfaceTypeToNumber(type: InterfaceType): number {
    switch (type) {
      case InterfaceType.ETHERNET:
        return 0;
      case InterfaceType.WIFI_AP:
        return 1;
      case InterfaceType.WIFI_MANAGED:
        return 2;
      case InterfaceType.LTE:
        return 6;
      case InterfaceType.LINK_EXTENDER:
        return 7;
      case InterfaceType.EXTENDER:
        return 8;
      default:
        return 0;
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
}
