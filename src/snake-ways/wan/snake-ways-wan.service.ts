// src/external-service/external-user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { ApiProperty } from '@nestjs/swagger';

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
export class SnakeWaysWanService extends SnakeWaysBaseService {
  constructor(protected readonly httpService: HttpService) {
    super(httpService);
    // Override logger with this class name
    Object.defineProperty(this, 'logger', {
      value: new Logger(SnakeWaysWanService.name),
    });
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

  //   /**
  //    * Get user by ID
  //    */
  //   async getUserById(id: string): Promise<User> {
  //     return this.get<User>(`/user/${id}`);
  //   }

  //   /**
  //    * Create a new user
  //    */
  //   async createUser(userData: Omit<User, 'id'>): Promise<User> {
  //     return this.post<User>('/user', userData);
  //   }

  //   /**
  //    * Update user information
  //    */
  //   async updateUser(id: string, userData: Partial<User>): Promise<User> {
  //     return this.put<User>(`/user/${id}`, userData);
  //   }

  //   /**
  //    * Delete a user
  //    */
  //   async deleteUser(id: string): Promise<{ success: boolean }> {
  //     return this.delete<{ success: boolean }>(`/user/${id}`);
  //   }
}
