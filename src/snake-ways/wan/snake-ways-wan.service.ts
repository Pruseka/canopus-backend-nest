import { OnModuleDestroy } from '@nestjs/common';
// src/external-service/external-user.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import chalk from 'chalk';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import {
  Wan as PrismaWan,
  PrepaidUsageMode as PrismaPrepaidUsageMode,
  DhcpStatus as PrismaDhcpStatus,
  WanStatus as PrismaWanStatus,
  UsagePeriodType as PrismaUsagePeriodType,
  UsageLimitStatus as PrismaUsageLimitStatus,
} from '@prisma/client';
import { WanEntity } from 'src/wan/entities/wan.entity';
/**
 * Enum for prepaid usage settings
 */
export enum PrepaidUsageMode {
  /** Disallow prepaid usage */
  DISALLOW = 0,
  /** Allow prepaid usage */
  ALLOW = 1,
  /** Limited prepaid usage */
  LIMITED = 2,
}

/**
 * Enum for DHCP status
 */
export enum DhcpStatus {
  /** DHCP enabled (automatic IP configuration) */
  ENABLED = 0,
  /** DHCP disabled (fixed IP settings) */
  DISABLED = 1,
}

/**
 * Enum for usage period types
 */
export enum UsagePeriodType {
  /** Daily usage period */
  DAILY = 1,
  /** Weekly usage period */
  WEEKLY = 2,
  /** Monthly usage period */
  MONTHLY = 3,
}

/**
 * Enum for WAN status
 */
export enum WanStatus {
  /** WAN is ready for use */
  READY = 0,
  /** WAN has encountered an error */
  ERROR = 1,
  /** WAN is suspended */
  SUSPENDED = 2,
  /** WAN is initializing */
  INITIALIZING = 3,
  /** All WAN connections forced off */
  ALL_WAN_FORCED_OFF = 4,
  /** WAN is not ready */
  NOT_READY = 5,
  /** Quota has been reached */
  QUOTA_REACHED = 6,
  /** WAN is online and working */
  ONLINE = 7,
}

/**
 * Enum for usage limit status
 */
export enum UsageLimitStatus {
  /** No usage limit applied */
  NO_LIMIT = 0,
  /** Usage limit is enforced */
  LIMIT_ENFORCED = 1,
  /** Usage limit disabled by user */
  LIMIT_DISABLED = 2,
}

/**
 * Snake Ways WAN Interface
 */
export class Wan {
  /**
   * Allow prepaid usage
   */
  @ApiProperty({
    enum: PrepaidUsageMode,
    description: 'Prepaid usage settings: 0=Disallow, 1=Allow, 2=Limited',
    example: PrepaidUsageMode.ALLOW,
  })
  AllowPrepaid: PrepaidUsageMode;

  /**
   * DHCP status
   */
  @ApiProperty({
    enum: DhcpStatus,
    description: 'DHCP status: 0=Enabled, 1=Disabled (fixed IP settings)',
    example: DhcpStatus.ENABLED,
  })
  DHCP: DhcpStatus;

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
   * ID of Interface
   */
  @ApiProperty({
    description: 'Unique identifier for the interface',
    example: 'eth0',
  })
  InterfaceID: string;

  /**
   * Interface IP
   */
  @ApiProperty({
    description: 'IP address assigned to the interface',
    example: '192.168.1.1',
  })
  IpAddress: string;

  /**
   * Gateway IP
   */
  @ApiProperty({
    description: 'Gateway IP address',
    example: '192.168.1.254',
  })
  IpGateway: string;

  /**
   * Maximum usage per prepaid user if limited
   */
  @ApiProperty({
    description: 'Maximum bytes allowed for prepaid usage if limited',
    example: 1073741824, // 1GB
  })
  PrepaidUsageMaxVolume: number;

  /**
   * Period for maximum usage per prepaid user if limited
   */
  @ApiProperty({
    enum: UsagePeriodType,
    description: 'Period type for prepaid usage: 1=daily, 2=weekly, 3=monthly',
    example: UsagePeriodType.MONTHLY,
  })
  PrepaidUsagePeriodType: UsagePeriodType;

  /**
   * WAN status
   */
  @ApiProperty({
    enum: WanStatus,
    description:
      'Current WAN status: 0=Ready, 1=Error, 2=Suspended, 3=Initializing, 4=All Wan forced off, 5=Not ready, 6=Quota reached, 7=Online',
    example: WanStatus.ONLINE,
  })
  Status: WanStatus;

  /**
   * Network Mask
   */
  @ApiProperty({
    description: 'Subnet mask',
    example: '255.255.255.0',
  })
  Subnetmask: string;

  /**
   * Autoswitching priority, 1 is highest
   */
  @ApiProperty({
    description: 'Autoswitching priority (1 is highest)',
    example: 1,
  })
  SwitchPriority: number;

  /**
   * Usage blocked status
   */
  @ApiProperty({
    description:
      'Usage blocked status: 0=Not blocked, >0=Timestamp when blocking started',
    example: 0,
  })
  UsageBlocked: number;

  /**
   * Amount of data used since UsageStart in bytes
   */
  @ApiProperty({
    description: 'Amount of data used since UsageStart in bytes',
    example: 5368709120, // 5GB
  })
  UsageBytes: number;

  /**
   * Usage limit status
   */
  @ApiProperty({
    enum: UsageLimitStatus,
    description:
      'Usage limit status: 0=No limit, 1=Limit enforced, 2=Limit disabled by user',
    example: UsageLimitStatus.LIMIT_ENFORCED,
  })
  UsageLimited: UsageLimitStatus;

  /**
   * Maximum number of bytes allowed
   */
  @ApiProperty({
    description: 'Maximum number of bytes allowed',
    example: 107374182400, // 100GB
  })
  UsageMaxBytes: number;

  /**
   * Number of days, weeks or months
   */
  @ApiProperty({
    description: 'Number of days, weeks or months for the usage period',
    example: 1,
  })
  UsagePeriod: number;

  /**
   * Usage period type
   */
  @ApiProperty({
    enum: UsagePeriodType,
    description: 'Usage period type: 1=daily, 2=weekly, 3=monthly',
    example: UsagePeriodType.MONTHLY,
  })
  UsagePeriodType: UsagePeriodType;

  /**
   * Start of current usage accounting period
   */
  @ApiProperty({
    description:
      'Start of current usage accounting period (YYYY-MM-DD HH:MM:SS)',
    example: '2023-01-01 00:00:00',
  })
  UsageStart: string;

  /**
   * Start of current usage accounting period as Unixtimestamp
   */
  @ApiProperty({
    description: 'Start of current usage accounting period as Unix timestamp',
    example: 1672531200, // 2023-01-01 00:00:00
  })
  UsageStartTimestamp: number;

  /**
   * Wan ID - 32 Byte hex string
   */
  @ApiProperty({
    description: 'WAN unique identifier (32 byte hex string)',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  })
  WanID: string;

  /**
   * Wan Name
   */
  @ApiProperty({
    description: 'User-friendly name for this WAN connection',
    example: 'Primary Internet Connection',
  })
  WanName: string;
}

@Injectable()
export class SnakeWaysWanService
  extends SnakeWaysBaseService
  implements OnModuleInit, OnModuleDestroy
{
  private wanPollingSubscription: Subscription;
  private wanDataStream$: Observable<{ wan: Wan[] } | null>;
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
      value: new Logger(SnakeWaysWanService.name),
    });

    this.pollingIntervalInMins =
      this.configService.get<number>('SNAKE_WAYS_WAN_POLLING_INTERVAL') || 100;
  }

  async onModuleInit() {
    this.startPollingWans();
  }

  private startPollingWans() {
    if (this.pollingActive) {
      this.logger.log(
        chalk.yellow('Wan Polling is already active, not starting again'),
      );
      return;
    }

    this.pollingActive = true;

    this.logger.log(
      chalk.blue.bold(
        `Starting to poll WANs from Snake Ways every ${this.pollingIntervalInMins} minutes`,
      ),
    );

    this.wanDataStream$ = this.createPollingObservable<{ wan: Wan[] }>(
      '/wan',
      this.pollingIntervalInMins * 1000, // Convert minutes to milliseconds
    );

    this.wanPollingSubscription = this.wanDataStream$.subscribe({
      next: async (data) => {
        if (data?.wan) {
          await this.syncWansWithDatabase(data.wan);
        }
      },
      error: (error) => {
        // This should rarely be called since we're catching errors in the observable
        this.logger.error(
          chalk.red.bold('Unexpected error in WAN polling subscription'),
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
            'Polling wans from Snake Ways completed or stopped due to max failures',
          ),
        );
        this.pollingActive = false;
      },
    });
  }

  public async restartPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(chalk.blue.bold('Attempting to restart wan polling'));
      // Reset the service availability status
      this.resetServiceAvailability();
      // Reset the consecutive failures counter for this endpoint
      this.resetConsecutiveFailures('/wan');
      // Start polling again
      this.startPollingWans();
      return true;
    }
    return false;
  }

  private async syncWansWithDatabase(snakeWaysWans: Wan[]) {
    try {
      this.logger.log(
        chalk.cyan(
          `Syncing ${chalk.bold(snakeWaysWans.length)} WANs from Snake Ways`,
        ),
      );

      for (const swWan of snakeWaysWans) {
        const upsertData = this.transformToPrismaWan(swWan);

        const wan = await this.prismaService.wan.upsert(upsertData);

        this.logger.log(
          chalk.green(`Synced Prisma Wan: ${wan.wanName} (${wan.id})`),
        );
      }
      this.logger.log(chalk.green.bold(`Wan sync completed successfully`));
    } catch (error) {
      this.logger.error('Failed to sync WANs with database', error);
    }
  }

  private transformToPrismaWan(swWan: Wan) {
    const mapPrepaidUsageMode = (
      mode: PrepaidUsageMode,
    ): PrismaPrepaidUsageMode => {
      switch (mode) {
        case PrepaidUsageMode.DISALLOW:
          return PrismaPrepaidUsageMode.DISALLOW;
        case PrepaidUsageMode.ALLOW:
          return PrismaPrepaidUsageMode.ALLOW;
        case PrepaidUsageMode.LIMITED:
          return PrismaPrepaidUsageMode.LIMITED;
        default:
          throw new Error(`Unknown prepaid usage mode: ${mode}`);
      }
    };

    const mapDhcpStatus = (status: DhcpStatus): PrismaDhcpStatus => {
      switch (status) {
        case DhcpStatus.ENABLED:
          return PrismaDhcpStatus.ENABLED;
        case DhcpStatus.DISABLED:
          return PrismaDhcpStatus.DISABLED;
        default:
          throw new Error(`Unknown DHCP status: ${status}`);
      }
    };

    const mapWanStatus = (status: WanStatus): PrismaWanStatus => {
      switch (status) {
        case WanStatus.READY:
          return PrismaWanStatus.READY;
        case WanStatus.ERROR:
          return PrismaWanStatus.ERROR;
        case WanStatus.SUSPENDED:
          return PrismaWanStatus.SUSPENDED;
        case WanStatus.INITIALIZING:
          return PrismaWanStatus.INITIALIZING;
        case WanStatus.ALL_WAN_FORCED_OFF:
          return PrismaWanStatus.ALL_WAN_FORCED_OFF;
        case WanStatus.NOT_READY:
          return PrismaWanStatus.NOT_READY;
        case WanStatus.QUOTA_REACHED:
          return PrismaWanStatus.QUOTA_REACHED;
        case WanStatus.ONLINE:
          return PrismaWanStatus.ONLINE;
        default:
          throw new Error(`Unknown WAN status: ${status}`);
      }
    };

    const mapUsageLimitStatus = (
      status: UsageLimitStatus,
    ): PrismaUsageLimitStatus => {
      switch (status) {
        case UsageLimitStatus.NO_LIMIT:
          return PrismaUsageLimitStatus.NO_LIMIT;
        case UsageLimitStatus.LIMIT_ENFORCED:
          return PrismaUsageLimitStatus.LIMIT_ENFORCED;
        case UsageLimitStatus.LIMIT_DISABLED:
          return PrismaUsageLimitStatus.LIMIT_DISABLED;
        default:
          throw new Error(`Unknown usage limit status: ${status}`);
      }
    };

    const mapUsagePeriodType = (
      type: UsagePeriodType,
    ): PrismaUsagePeriodType => {
      switch (type) {
        case UsagePeriodType.DAILY:
          return PrismaUsagePeriodType.DAILY;
        case UsagePeriodType.WEEKLY:
          return PrismaUsagePeriodType.WEEKLY;
        case UsagePeriodType.MONTHLY:
          return PrismaUsagePeriodType.MONTHLY;
        default:
          throw new Error(`Unknown usage period type: ${type}`);
      }
    };

    const usageStart = swWan.UsageStart
      ? new Date(swWan.UsageStart)
      : undefined;

    const usageBlocked = BigInt(swWan.UsageBlocked);
    const usageInBytes = BigInt(swWan.UsageBytes);
    const maxUsageInBytes = BigInt(swWan.UsageMaxBytes);
    const usagePeriodInDays = swWan.UsagePeriod;

    this.logger.log(
      chalk.cyan(`Processing WAN: ${swWan.WanName} (${swWan.WanID})`),
    );

    return {
      where: {
        id: swWan.WanID,
      },
      update: {
        wanName: swWan.WanName,
        wanStatus: mapWanStatus(swWan.Status),
        prepaidUsageMode: mapPrepaidUsageMode(swWan.AllowPrepaid),
        dhcp: mapDhcpStatus(swWan.DHCP),
        dns1: swWan.DNS1,
        dns2: swWan.DNS2,
        interfaceId: swWan.InterfaceID,
        ipAddress: swWan.IpAddress,
        ipGateway: swWan.IpGateway,
        prepaidUsageMaxVolume: swWan.PrepaidUsageMaxVolume,
        prepaidUsagePeriodType: mapUsagePeriodType(
          swWan.PrepaidUsagePeriodType,
        ),
        usageBlocked,
        usageInBytes,
        maxUsageInBytes,
        usagePeriodInDays,
        usageStart,
        usagePeriodType: mapUsagePeriodType(swWan.UsagePeriodType),
        usageLimitStatus: mapUsageLimitStatus(swWan.UsageLimited),
        updatedAt: new Date(),
      },
      create: {
        id: swWan.WanID,
        wanName: swWan.WanName,
        wanStatus: mapWanStatus(swWan.Status),
        prepaidUsageMode: mapPrepaidUsageMode(swWan.AllowPrepaid),
        dhcp: mapDhcpStatus(swWan.DHCP),
        dns1: swWan.DNS1,
        dns2: swWan.DNS2,
        interfaceId: swWan.InterfaceID,
        ipAddress: swWan.IpAddress,
        ipGateway: swWan.IpGateway,
        prepaidUsageMaxVolume: swWan.PrepaidUsageMaxVolume,
        prepaidUsagePeriodType: mapUsagePeriodType(
          swWan.PrepaidUsagePeriodType,
        ),
        usageBlocked,
        usageInBytes,
        usageStart,
        maxUsageInBytes,
        usagePeriodInDays,
        usagePeriodType: mapUsagePeriodType(swWan.UsagePeriodType),
        usageLimitStatus: mapUsageLimitStatus(swWan.UsageLimited),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Get a list of all WAN connections
   */
  async getAllWans(): Promise<Wan[]> {
    try {
      const wans = await this.get<Wan[]>('/wan');
      return wans || [];
    } catch (error) {
      this.logger.error('Failed to get WAN connections', error);
      return [];
    }
  }

  /**
   * Force an immediate synchronization with Snake Ways
   * @returns Object containing the number of wans synchronized and the wans themselves
   */
  async forceSync(): Promise<{ count: number; wans: PrismaWan[] }> {
    this.logger.log(
      chalk.yellow.bold(
        'Manually triggering wan synchronization with Snake Ways',
      ),
    );
    try {
      // Fetch latest users from Snake Ways
      const response = await this.get<{ wan: Wan[] }>('/wan');

      let prismaWans: PrismaWan[] = await this.prismaService.wan.findMany();

      if (!response?.wan) {
        this.logger.warn(
          chalk.yellow('No wans returned from Snake Ways during force sync'),
        );
        // if the external service returns no users, return the users that were already in the database
        return { count: prismaWans.length, wans: prismaWans };
      }

      // Perform synchronization
      await this.syncWansWithDatabase(response.wan);

      this.logger.log(
        chalk.green.bold(
          `Force sync completed: ${chalk.white(response.wan.length)} wans synchronized`,
        ),
      );

      prismaWans = await this.prismaService.wan.findMany();

      return { count: prismaWans.length, wans: prismaWans };
    } catch (error) {
      this.logger.error(chalk.red.bold('Force sync failed'), error);
      throw new Error(`Force synchronization failed: ${error.message}`);
    }
  }

  onModuleDestroy() {
    if (this.wanPollingSubscription) {
      this.logger.log(chalk.blue('Stopping wan polling'));
      this.wanPollingSubscription.unsubscribe();
      this.pollingActive = false;
    }
  }

  transformToWanEntities(swWans: Wan[]) {
    const wans: WanEntity[] = [];

    for (const swWan of swWans) {
      // Map Snake Ways WAN status to Prisma WAN status
      const wanStatus = (() => {
        switch (swWan.Status) {
          case WanStatus.READY:
            return PrismaWanStatus.READY;
          case WanStatus.ERROR:
            return PrismaWanStatus.ERROR;
          case WanStatus.SUSPENDED:
            return PrismaWanStatus.SUSPENDED;
          case WanStatus.INITIALIZING:
            return PrismaWanStatus.INITIALIZING;
          case WanStatus.ALL_WAN_FORCED_OFF:
            return PrismaWanStatus.ALL_WAN_FORCED_OFF;
          case WanStatus.NOT_READY:
            return PrismaWanStatus.NOT_READY;
          case WanStatus.QUOTA_REACHED:
            return PrismaWanStatus.QUOTA_REACHED;
          case WanStatus.ONLINE:
            return PrismaWanStatus.ONLINE;
          default:
            return PrismaWanStatus.NOT_READY;
        }
      })();

      // Map Snake Ways prepaid usage mode to Prisma prepaid usage mode
      const prepaidUsageMode = (() => {
        switch (swWan.AllowPrepaid) {
          case PrepaidUsageMode.DISALLOW:
            return PrismaPrepaidUsageMode.DISALLOW;
          case PrepaidUsageMode.ALLOW:
            return PrismaPrepaidUsageMode.ALLOW;
          case PrepaidUsageMode.LIMITED:
            return PrismaPrepaidUsageMode.LIMITED;
          default:
            return PrismaPrepaidUsageMode.ALLOW;
        }
      })();

      // Map Snake Ways DHCP status to Prisma DHCP status
      const dhcpStatus = (() => {
        switch (swWan.DHCP) {
          case DhcpStatus.ENABLED:
            return PrismaDhcpStatus.ENABLED;
          case DhcpStatus.DISABLED:
            return PrismaDhcpStatus.DISABLED;
          default:
            return PrismaDhcpStatus.ENABLED;
        }
      })();

      // Map Snake Ways usage limit status to Prisma usage limit status
      const usageLimitStatus = (() => {
        switch (swWan.UsageLimited) {
          case UsageLimitStatus.NO_LIMIT:
            return PrismaUsageLimitStatus.NO_LIMIT;
          case UsageLimitStatus.LIMIT_ENFORCED:
            return PrismaUsageLimitStatus.LIMIT_ENFORCED;
          case UsageLimitStatus.LIMIT_DISABLED:
            return PrismaUsageLimitStatus.LIMIT_DISABLED;
          default:
            return PrismaUsageLimitStatus.NO_LIMIT;
        }
      })();

      // Map Snake Ways usage period type to Prisma usage period type
      const usagePeriodType = swWan.UsagePeriodType
        ? (() => {
            switch (swWan.UsagePeriodType) {
              case UsagePeriodType.DAILY:
                return PrismaUsagePeriodType.DAILY;
              case UsagePeriodType.WEEKLY:
                return PrismaUsagePeriodType.WEEKLY;
              case UsagePeriodType.MONTHLY:
                return PrismaUsagePeriodType.MONTHLY;
              default:
                return PrismaUsagePeriodType.MONTHLY;
            }
          })()
        : null;

      // Map Snake Ways prepaid usage period type to Prisma usage period type
      const prepaidUsagePeriodType = swWan.PrepaidUsagePeriodType
        ? (() => {
            switch (swWan.PrepaidUsagePeriodType) {
              case UsagePeriodType.DAILY:
                return PrismaUsagePeriodType.DAILY;
              case UsagePeriodType.WEEKLY:
                return PrismaUsagePeriodType.WEEKLY;
              case UsagePeriodType.MONTHLY:
                return PrismaUsagePeriodType.MONTHLY;
              default:
                return PrismaUsagePeriodType.MONTHLY;
            }
          })()
        : null;

      // Convert usage start to Date object
      const usageStart = swWan.UsageStart ? new Date(swWan.UsageStart) : null;

      // Convert numeric values to BigInt
      const usageBlocked = BigInt(swWan.UsageBlocked);
      const usageInBytes = BigInt(swWan.UsageBytes);
      const maxUsageInBytes = BigInt(swWan.UsageMaxBytes);
      const prepaidUsageMaxVolume = swWan.PrepaidUsageMaxVolume
        ? BigInt(swWan.PrepaidUsageMaxVolume)
        : null;

      // Create a WanEntity instance
      const wanEntity = new WanEntity({
        id: swWan.WanID,
        userId: '', // This would need to be set based on your application's logic
        wanId: swWan.WanID,
        wanName: swWan.WanName,
        wanStatus,
        prepaidUsageMode,
        dhcp: dhcpStatus,
        dns1: swWan.DNS1,
        dns2: swWan.DNS2,
        interfaceId: swWan.InterfaceID,
        ipAddress: swWan.IpAddress,
        ipGateway: swWan.IpGateway,
        prepaidUsageMaxVolume,
        prepaidUsagePeriodType,
        subnetmask: swWan.Subnetmask,
        switchPriority: swWan.SwitchPriority,
        usageBlocked,
        usageInBytes,
        usageLimitStatus,
        maxUsageInBytes,
        usagePeriodInDays: swWan.UsagePeriod,
        usagePeriodType,
        usageStart,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      wans.push(wanEntity);
    }

    return wans;
  }
}
