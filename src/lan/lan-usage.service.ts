import { Injectable, Logger } from '@nestjs/common';
import { LanUsageEntity } from './entities/lan-usage.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { LanInterfaceDto, LanWithUsageDto, NetworkInterfaceDto } from './dto';
import { InterfaceType } from '@prisma/client';
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

  constructor(private readonly prismaService: PrismaService) {}

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
          where.snapshotDate.gte = startDate;
        }

        if (endDate) {
          where.snapshotDate.lte = endDate;
        }
      }

      // Get LAN usage records from database
      const lanUsageRecords = await this.prismaService.lanUsage.findMany({
        where,
        orderBy: {
          snapshotDate: 'desc',
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

      // Transform to entities
      return lanUsageRecords.map(
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
            usageWhere.snapshotDate.gte = startDate;
          }

          if (endDate) {
            usageWhere.snapshotDate.lte = endDate;
          }
        }

        // Get usage records for this LAN
        const usageRecords = await this.prismaService.lanUsage.findMany({
          where: usageWhere,
          orderBy: {
            snapshotDate: 'desc',
          },
          include: {
            wan: {
              select: {
                wanName: true,
              },
            },
          },
        });

        // Calculate total bytes
        let totalBytes = 0;
        if (usageRecords.length > 0) {
          for (const record of usageRecords) {
            totalBytes += Number(record.bytes);
          }
        }

        // Transform to LanUsageEntity objects
        const usageEntities = usageRecords.map(
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
          lanId: lan.lanId,
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
