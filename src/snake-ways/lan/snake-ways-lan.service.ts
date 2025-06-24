import { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import { Lan as PrismaLan } from '@prisma/client';
import {
  LanEntity,
  InterfaceData,
  LanDhcpStatus,
  LanQosLevel,
} from 'src/lan/entities';
import { AxiosRequestConfig } from 'axios';
import { SnakeWaysInterfaceService } from '../interface/snake-ways-interface.service';
const chalk = require('chalk');

/**
 * Enum for DHCP status
 */
export enum DhcpStatus {
  /** DHCP server enabled */
  ENABLED = 0,
  /** DHCP server disabled */
  DISABLED = 1,
}

/**
 * Snake Ways LAN Interface
 */
export class Lan {
  /**
   * LAN identifier
   */
  @ApiProperty({
    description: 'LAN unique identifier (32 byte hex string)',
    example: '979F48BB166A11EDA4F51737CD617E52',
  })
  LanID: string;

  /**
   * LAN Name
   */
  @ApiProperty({
    description: 'User-friendly name for this LAN connection',
    example: 'BUSINESS',
  })
  LanName: string;

  /**
   * Interfaces this LAN is using
   */
  @ApiProperty({
    description: 'Array of interface IDs this LAN is using',
    type: 'array',
    example: [{ InterfaceID: '97A0AC67166A11EDA4F51737CD617E52' }],
  })
  Interface: InterfaceData[];

  /**
   * Interface IP
   */
  @ApiProperty({
    description: 'IP address assigned to the interface',
    example: '192.168.77.1',
  })
  IpAddress: string;

  /**
   * Network Mask
   */
  @ApiProperty({
    description: 'Subnet mask',
    example: '255.255.255.0',
  })
  Subnetmask: string;

  /**
   * Primary DNS server
   */
  @ApiProperty({
    description: 'Primary DNS server IP address',
    example: '8.8.8.8',
  })
  DNS1: string;

  /**
   * Secondary DNS server
   */
  @ApiProperty({
    description: 'Secondary DNS server IP address',
    example: '8.8.4.4',
  })
  DNS2: string;

  /**
   * DHCP status
   */
  @ApiProperty({
    enum: DhcpStatus,
    description: 'DHCP server status: 0=Enabled, 1=Disabled',
    example: DhcpStatus.ENABLED,
  })
  DHCP: DhcpStatus;

  /**
   * Start of DHCP IP range
   */
  @ApiProperty({
    description: 'Start of DHCP IP range',
    example: '192.168.77.20',
  })
  DhcpRangeFrom: string;

  /**
   * End of DHCP IP range
   */
  @ApiProperty({
    description: 'End of DHCP IP range',
    example: '192.168.77.200',
  })
  DhcpRangeTo: string;

  /**
   * Access to WAN gateway IP
   */
  @ApiProperty({
    description: 'Access to WAN gateway IP: 0=blocked, 1=allowed',
    example: 1,
  })
  AllowGateway: number;

  /**
   * Captive portal status
   */
  @ApiProperty({
    description: 'Captive portal status: 0=disabled, 1=enabled',
    example: 0,
  })
  CaptivePortal: number;

  /**
   * QOS level for this LAN
   */
  @ApiProperty({
    description: 'QOS level set for this LAN',
    example: 'High',
  })
  QOS: string;
}

@Injectable()
export class SnakeWaysLanService
  extends SnakeWaysBaseService
  implements OnModuleInit, OnModuleDestroy
{
  private lanPollingSubscription: Subscription;
  private lanDataStream$: Observable<{ lan: Lan[] } | null>;
  private pollingActive = false;
  private pollingIntervalInMins: number;

  constructor(
    protected readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly interfaceService: SnakeWaysInterfaceService,
  ) {
    super(httpService);
    // Override logger with this class name
    Object.defineProperty(this, 'logger', {
      value: new Logger(SnakeWaysLanService.name),
    });

    this.pollingIntervalInMins =
      this.configService.get<number>('SNAKE_WAYS_LAN_POLLING_INTERVAL') || 100;
  }

  async onModuleInit() {
    // Delay LAN polling to ensure network interfaces are initialized first
    // Give interface service a head start (5 seconds) before starting LAN polling
    setTimeout(() => {
      this.logger.log(
        chalk.blue(
          'Starting LAN polling with delayed start (after interfaces)',
        ),
      );
      this.startPollingLans();
    }, 5000);
  }

  private startPollingLans() {
    if (this.pollingActive) {
      this.logger.log(
        chalk.yellow('LAN Polling is already active, not starting again'),
      );
      return;
    }

    this.pollingActive = true;

    this.logger.log(
      chalk.blue.bold(
        `Starting to poll LANs from Snake Ways every ${this.pollingIntervalInMins} minutes`,
      ),
    );

    this.lanDataStream$ = this.createPollingObservable<{ lan: Lan[] }>(
      '/lan',
      this.pollingIntervalInMins * 1000, // Convert minutes to milliseconds
    );

    this.lanPollingSubscription = this.lanDataStream$.subscribe({
      next: async (data) => {
        if (data?.lan) {
          await this.syncLansWithDatabase(data.lan);
        }
      },
      error: (error) => {
        // This should rarely be called since we're catching errors in the observable
        this.logger.error(
          chalk.red.bold('Unexpected error in LAN polling subscription'),
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
            'Polling LANs from Snake Ways completed or stopped due to max failures',
          ),
        );
        this.pollingActive = false;
      },
    });
  }

  public async restartPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(chalk.blue.bold('Attempting to restart LAN polling'));
      // Reset the service availability status
      this.resetServiceAvailability();
      // Reset the consecutive failures counter for this endpoint
      this.resetConsecutiveFailures('/lan');
      // Start polling again
      this.startPollingLans();
      return true;
    }
    return false;
  }

  private async syncLansWithDatabase(snakeWaysLans: Lan[]) {
    try {
      this.logger.log(
        chalk.cyan(
          `Syncing ${chalk.bold(snakeWaysLans.length)} LANs from Snake Ways`,
        ),
      );

      for (const swLan of snakeWaysLans) {
        // Transform the Snake Ways LAN to Prisma format
        const upsertData = this.transformToPrismaLan(swLan);

        // Upsert the LAN
        const lan = await this.prismaService.lan.upsert(upsertData);

        // Now handle the interfaces for this LAN
        await this.syncLanInterfaces(lan.id, swLan.Interface);

        this.logger.log(
          chalk.green(`Synced Prisma LAN: ${lan.lanName} (${lan.id})`),
        );
      }
      this.logger.log(chalk.green.bold(`LAN sync completed successfully`));
    } catch (error) {
      this.logger.error('Failed to sync LANs with database', error);
    }
  }

  private async syncLanInterfaces(lanId: string, interfaces: InterfaceData[]) {
    try {
      // Use Prisma's transaction API
      await this.prismaService.$transaction(async (tx) => {
        // Delete existing interfaces for this LAN
        await tx.lanInterface.deleteMany({
          where: {
            lanId: lanId,
          },
        });

        // Create new interfaces
        for (const iface of interfaces) {
          try {
            await tx.lanInterface.create({
              data: {
                lanId: lanId,
                interfaceId: iface.InterfaceID,
              },
            });
          } catch (error) {
            // If there's a foreign key constraint issue, log it but continue with other interfaces
            if (error.code === 'P2003') {
              this.logger.warn(
                chalk.yellow(
                  `Interface ${iface.InterfaceID} not found in NetworkInterface table. Will sync LAN without this interface.`,
                ),
              );
            } else {
              throw error; // Re-throw other types of errors
            }
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to sync interfaces for LAN ${lanId}`, error);
      throw error;
    }
  }

  private transformToPrismaLan(swLan: Lan) {
    const mapDhcpStatus = (status: DhcpStatus): LanDhcpStatus => {
      switch (status) {
        case DhcpStatus.ENABLED:
          return LanDhcpStatus.ENABLED;
        case DhcpStatus.DISABLED:
          return LanDhcpStatus.DISABLED;
        default:
          throw new Error(`Unknown DHCP status: ${status}`);
      }
    };

    const mapQosLevel = (qos: string): LanQosLevel => {
      switch (qos.toLowerCase()) {
        case 'high':
          return LanQosLevel.HIGH;
        case 'medium':
          return LanQosLevel.MEDIUM;
        case 'low':
          return LanQosLevel.LOW;
        default:
          return LanQosLevel.MEDIUM; // Default to medium if unknown
      }
    };

    this.logger.log(
      chalk.cyan(`Processing LAN: ${swLan.LanName} (${swLan.LanID})`),
    );

    return {
      where: {
        id: swLan.LanID,
      },
      update: {
        lanName: swLan.LanName,
        ipAddress: swLan.IpAddress,
        subnetmask: swLan.Subnetmask,
        dns1: swLan.DNS1 !== '0.0.0.0' ? swLan.DNS1 : null,
        dns2: swLan.DNS2 !== '0.0.0.0' ? swLan.DNS2 : null,
        dhcp: mapDhcpStatus(swLan.DHCP),
        dhcpRangeFrom: swLan.DhcpRangeFrom,
        dhcpRangeTo: swLan.DhcpRangeTo,
        allowGateway: !!swLan.AllowGateway,
        captivePortal: !!swLan.CaptivePortal,
        qos: mapQosLevel(swLan.QOS),
        updatedAt: new Date(),
      },
      create: {
        id: swLan.LanID,
        lanName: swLan.LanName,
        ipAddress: swLan.IpAddress,
        subnetmask: swLan.Subnetmask,
        dns1: swLan.DNS1 !== '0.0.0.0' ? swLan.DNS1 : null,
        dns2: swLan.DNS2 !== '0.0.0.0' ? swLan.DNS2 : null,
        dhcp: mapDhcpStatus(swLan.DHCP),
        dhcpRangeFrom: swLan.DhcpRangeFrom,
        dhcpRangeTo: swLan.DhcpRangeTo,
        allowGateway: !!swLan.AllowGateway,
        captivePortal: !!swLan.CaptivePortal,
        qos: mapQosLevel(swLan.QOS),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Get a list of all LAN connections
   */
  async getAllLans(): Promise<Lan[]> {
    try {
      const lans = await this.get<Lan[]>('/lan');
      return lans || [];
    } catch (error) {
      this.logger.error('Failed to get LAN connections', error);
      throw new Error(`Failed to get LAN connections: ${error.message}`);
    }
  }

  /**
   * Get a specific LAN by ID
   */
  async getLanById(lanId: string): Promise<Lan | null> {
    try {
      // Construct query parameters correctly as part of AxiosRequestConfig
      const config: AxiosRequestConfig = {
        params: { lanid: lanId },
      };

      // Call the API with query parameters
      const response = await this.get<{ lan: Lan[] }>('/lan', config);

      // Return the first LAN or null if none found
      if (response?.lan && response.lan.length > 0) {
        return response.lan[0];
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get LAN with ID ${lanId}`, error);
      throw new Error(`Failed to get LAN with ID ${lanId}: ${error.message}`);
    }
  }

  /**
   * Force an immediate synchronization with Snake Ways
   * @returns Object containing the number of LANs synchronized and the LANs themselves
   */
  async forceSync(): Promise<{ count: number; lans: PrismaLan[] }> {
    this.logger.log(
      chalk.yellow.bold(
        'Manually triggering LAN synchronization with Snake Ways',
      ),
    );
    try {
      // Fetch latest LANs from Snake Ways
      const response = await this.get<{ lan: Lan[] }>('/lan');

      let prismaLans: PrismaLan[] = await this.prismaService.lan.findMany();

      if (!response?.lan) {
        this.logger.warn(
          chalk.yellow('No LANs returned from Snake Ways during force sync'),
        );
        // if the external service returns no LANs, return the LANs that were already in the database
        return { count: prismaLans.length, lans: prismaLans };
      }

      // Perform synchronization
      await this.syncLansWithDatabase(response.lan);

      this.logger.log(
        chalk.green.bold(
          `Force sync completed: ${chalk.white(response.lan.length)} LANs synchronized`,
        ),
      );

      prismaLans = await this.prismaService.lan.findMany();

      return { count: prismaLans.length, lans: prismaLans };
    } catch (error) {
      this.logger.error(chalk.red.bold('Force sync failed'), error);
      throw new Error(`Force synchronization failed: ${error.message}`);
    }
  }

  onModuleDestroy() {
    if (this.lanPollingSubscription) {
      this.logger.log(chalk.blue('Stopping LAN polling'));
      this.lanPollingSubscription.unsubscribe();
      this.pollingActive = false;
    }
  }

  transformToLanEntities(swLans: Lan[]) {
    const lans: LanEntity[] = [];

    for (const swLan of swLans) {
      // Map Snake Ways DHCP status to Prisma DHCP status
      const dhcpStatus = (() => {
        switch (swLan.DHCP) {
          case DhcpStatus.ENABLED:
            return LanDhcpStatus.ENABLED;
          case DhcpStatus.DISABLED:
            return LanDhcpStatus.DISABLED;
          default:
            return LanDhcpStatus.ENABLED;
        }
      })();

      // Map QOS level string to enum
      const qosLevel = (() => {
        switch (swLan.QOS.toLowerCase()) {
          case 'high':
            return LanQosLevel.HIGH;
          case 'medium':
            return LanQosLevel.MEDIUM;
          case 'low':
            return LanQosLevel.LOW;
          default:
            return LanQosLevel.MEDIUM; // Default to medium if unknown
        }
      })();

      // Map interface array format
      const interfaces = swLan.Interface.map((iface) => ({
        interfaceId: iface.InterfaceID,
      }));

      // Create a LanEntity instance
      const lanEntity = new LanEntity({
        id: swLan.LanID,
        lanId: swLan.LanID,
        lanName: swLan.LanName,
        interfaces,
        ipAddress: swLan.IpAddress,
        subnetmask: swLan.Subnetmask,
        dns1: swLan.DNS1 !== '0.0.0.0' ? swLan.DNS1 : null,
        dns2: swLan.DNS2 !== '0.0.0.0' ? swLan.DNS2 : null,
        dhcp: dhcpStatus,
        dhcpRangeFrom: swLan.DhcpRangeFrom,
        dhcpRangeTo: swLan.DhcpRangeTo,
        allowGateway: !!swLan.AllowGateway,
        captivePortal: !!swLan.CaptivePortal,
        qos: qosLevel,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      lans.push(lanEntity);
    }

    return lans;
  }
}
