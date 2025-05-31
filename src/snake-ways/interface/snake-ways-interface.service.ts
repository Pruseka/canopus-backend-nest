import { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import { InterfaceType as PrismaInterfaceType } from '@prisma/client';
import { AxiosRequestConfig } from 'axios';
const chalk = require('chalk');

import { ApiProperty } from '@nestjs/swagger';

/**
 * Enum for interface types
 */
export enum InterfaceType {
  ETHERNET = 0,
  WIFI_AP = 1,
  WIFI_MANAGED = 2,
  LTE = 6,
  LINK_EXTENDER = 7,
  EXTENDER = 8,
}

/**
 * Snake Ways Network Interface
 */
export class InterfaceClass {
  /**
   * Interface identifier
   */
  @ApiProperty({
    description: 'Interface unique identifier (32 byte hex string)',
    example: '97A0AC67166A11EDA4F51737CD617E52',
  })
  InterfaceID: string;

  /**
   * Interface Name
   */
  @ApiProperty({
    description: 'User-friendly name for this interface',
    example: 'BUSINESS',
  })
  Name: string;

  /**
   * Interface status
   */
  @ApiProperty({
    description: 'Interface status: 0=down, >0=interface speed',
    example: 100,
  })
  Status: number;

  /**
   * Interface type
   */
  @ApiProperty({
    description:
      'Interface type: 0=Ethernet, 1=WiFi_AP, 2=WiFi_Managed, 6=LTE, 7=Link to Extender, 8=Extender',
    example: 0,
  })
  Type: number;

  /**
   * Physical port
   */
  @ApiProperty({
    description: 'Physical Port: 0-5, Wi-Fi Port: 1-4, Extender: 1-16',
    example: 1,
  })
  Port: number;

  /**
   * VLAN ID
   */
  @ApiProperty({
    description: 'VLAN ID: 0=not a VLAN, >0=VLAN ID',
    example: 0,
  })
  VlanID: number;
}

@Injectable()
export class SnakeWaysInterfaceService
  extends SnakeWaysBaseService
  implements OnModuleInit, OnModuleDestroy
{
  private interfacePollingSubscription: Subscription;
  private interfaceDataStream$: Observable<{
    interface: InterfaceClass[];
  } | null>;
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
      value: new Logger(SnakeWaysInterfaceService.name),
    });

    this.pollingIntervalInMins =
      this.configService.get<number>('SNAKE_WAYS_INTERFACE_POLLING_INTERVAL') ||
      120;
  }

  async onModuleInit() {
    // Start polling interfaces on module init
    this.startPollingInterfaces();
  }

  private startPollingInterfaces() {
    if (this.pollingActive) {
      this.logger.log(
        chalk.yellow('Interface Polling is already active, not starting again'),
      );
      return;
    }

    this.pollingActive = true;

    this.logger.log(
      chalk.blue.bold(
        `Starting to poll interfaces from Snake Ways every ${this.pollingIntervalInMins} minutes`,
      ),
    );

    this.interfaceDataStream$ = this.createPollingObservable<{
      interface: InterfaceClass[];
    }>(
      '/interface',
      this.pollingIntervalInMins * 1000, // Convert minutes to milliseconds
    );

    this.interfacePollingSubscription = this.interfaceDataStream$.subscribe({
      next: async (data) => {
        if (data?.interface) {
          await this.syncInterfacesWithDatabase(data.interface);
        }
      },
      error: (error) => {
        // This should rarely be called since we're catching errors in the observable
        this.logger.error(
          chalk.red.bold('Unexpected error in interface polling subscription'),
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
            'Polling interfaces from Snake Ways completed or stopped due to max failures',
          ),
        );
        this.pollingActive = false;
      },
    });
  }

  public async restartPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(
        chalk.blue.bold('Attempting to restart interface polling'),
      );
      // Reset the service availability status
      this.resetServiceAvailability();
      // Reset the consecutive failures counter for this endpoint
      this.resetConsecutiveFailures('/interface');
      // Start polling again
      this.startPollingInterfaces();
      return true;
    }
    return false;
  }

  private async syncInterfacesWithDatabase(
    snakeWaysInterfaces: InterfaceClass[],
  ) {
    try {
      this.logger.log(
        chalk.cyan(
          `Syncing ${chalk.bold(snakeWaysInterfaces.length)} interfaces from Snake Ways`,
        ),
      );

      for (const swInterface of snakeWaysInterfaces) {
        // Map Snake Ways interface type to Prisma enum
        const interfaceType = this.mapInterfaceType(swInterface.Type);

        // Upsert the interface
        await this.prismaService.networkInterface.upsert({
          where: {
            interfaceId: swInterface.InterfaceID,
          },
          update: {
            name: swInterface.Name,
            status: swInterface.Status,
            type: interfaceType,
            port: swInterface.Port,
            vlanId: swInterface.VlanID,
            updatedAt: new Date(),
          },
          create: {
            interfaceId: swInterface.InterfaceID,
            name: swInterface.Name,
            status: swInterface.Status,
            type: interfaceType,
            port: swInterface.Port,
            vlanId: swInterface.VlanID,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          chalk.green(
            `Synced interface: ${swInterface.Name} (${swInterface.InterfaceID})`,
          ),
        );
      }
      this.logger.log(
        chalk.green.bold(`Interface sync completed successfully`),
      );
    } catch (error) {
      this.logger.error('Failed to sync interfaces with database', error);
    }
  }

  public mapInterfaceType(type: number): PrismaInterfaceType {
    switch (type) {
      case 0:
        return PrismaInterfaceType.ETHERNET;
      case 1:
        return PrismaInterfaceType.WIFI_AP;
      case 2:
        return PrismaInterfaceType.WIFI_MANAGED;
      case 6:
        return PrismaInterfaceType.LTE;
      case 7:
        return PrismaInterfaceType.LINK_EXTENDER;
      case 8:
        return PrismaInterfaceType.EXTENDER;
      default:
        this.logger.warn(
          `Unknown interface type: ${type}, defaulting to ETHERNET`,
        );
        return PrismaInterfaceType.ETHERNET;
    }
  }

  /**
   * Get a list of all network interfaces
   */
  async getAllInterfaces(): Promise<InterfaceClass[]> {
    try {
      const interfaces = await this.get<{ interface: InterfaceClass[] }>(
        '/interface',
      );
      return interfaces?.interface || [];
    } catch (error) {
      this.logger.error('Failed to get network interfaces', error);
      throw new Error(`Failed to get network interfaces: ${error.message}`);
    }
  }

  /**
   * Get a specific interface by ID
   */
  async getInterfaceById(interfaceId: string): Promise<InterfaceClass | null> {
    try {
      // Construct query parameters correctly as part of AxiosRequestConfig
      const config: AxiosRequestConfig = {
        params: { interfaceid: interfaceId },
      };

      // Call the API with query parameters
      const response = await this.get<{ interface: InterfaceClass[] }>(
        '/interface',
        config,
      );

      // Return the first interface or null if none found
      if (response?.interface && response.interface.length > 0) {
        return response.interface[0];
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get interface with ID ${interfaceId}`,
        error,
      );
      throw new Error(
        `Failed to get interface with ID ${interfaceId}: ${error.message}`,
      );
    }
  }

  /**
   * Force an immediate synchronization with Snake Ways
   */
  async forceSync(): Promise<number> {
    this.logger.log(
      chalk.yellow.bold(
        'Manually triggering interface synchronization with Snake Ways',
      ),
    );
    try {
      // Fetch latest interfaces from Snake Ways
      const response = await this.get<{ interface: InterfaceClass[] }>(
        '/interface',
      );

      if (!response?.interface) {
        this.logger.warn(
          chalk.yellow(
            'No interfaces returned from Snake Ways during force sync',
          ),
        );
        return 0;
      }

      // Perform synchronization
      await this.syncInterfacesWithDatabase(response.interface);

      this.logger.log(
        chalk.green.bold(
          `Force sync completed: ${chalk.white(response.interface.length)} interfaces synchronized`,
        ),
      );

      return response.interface.length;
    } catch (error) {
      this.logger.error(chalk.red.bold('Force sync failed'), error);
      throw new Error(`Force synchronization failed: ${error.message}`);
    }
  }

  onModuleDestroy() {
    if (this.interfacePollingSubscription) {
      this.logger.log(chalk.blue('Stopping interface polling'));
      this.interfacePollingSubscription.unsubscribe();
      this.pollingActive = false;
    }
  }
}
