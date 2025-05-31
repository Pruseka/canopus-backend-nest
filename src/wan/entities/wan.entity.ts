import { ApiProperty } from '@nestjs/swagger';
import {
  DhcpStatus,
  PrepaidUsageMode,
  UsageLimitStatus,
  UsagePeriodType,
  Wan,
  WanStatus,
} from '@prisma/client';

export class WanEntity
  implements
    Omit<
      Wan,
      | 'usageBlocked'
      | 'usageInBytes'
      | 'maxUsageInBytes'
      | 'prepaidUsageMaxVolume'
    >
{
  constructor(partial: Partial<any>) {
    Object.assign(this, partial);

    // Handle bigint conversion for serialization
    if (partial.usageBlocked !== undefined) {
      if (typeof partial.usageBlocked === 'bigint') {
        this.usageBlocked = Number(partial.usageBlocked);
      } else {
        this.usageBlocked = Number(partial.usageBlocked);
      }
    }

    if (partial.usageInBytes !== undefined) {
      if (typeof partial.usageInBytes === 'bigint') {
        this.usageInBytes = Number(partial.usageInBytes);
      } else {
        this.usageInBytes = Number(partial.usageInBytes);
      }
    }

    if (partial.maxUsageInBytes !== undefined) {
      if (typeof partial.maxUsageInBytes === 'bigint') {
        this.maxUsageInBytes = Number(partial.maxUsageInBytes);
      } else {
        this.maxUsageInBytes = Number(partial.maxUsageInBytes);
      }
    }

    if (partial.prepaidUsageMaxVolume !== undefined) {
      if (typeof partial.prepaidUsageMaxVolume === 'bigint') {
        this.prepaidUsageMaxVolume = Number(partial.prepaidUsageMaxVolume);
      } else {
        this.prepaidUsageMaxVolume = Number(partial.prepaidUsageMaxVolume);
      }
    }
  }

  @ApiProperty({
    description: 'Unique identifier for the WAN',
    example: 'clj5abcde12345',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with this WAN',
    example: 'clj5abcde12345',
  })
  userId: string;

  @ApiProperty({
    description: 'When the WAN was created',
    example: '2023-05-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the WAN was last updated',
    example: '2023-05-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'WAN identifier from Snake Ways',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  })
  wanId: string;

  @ApiProperty({
    description: 'User-friendly name for this WAN connection',
    example: 'Primary Internet Connection',
  })
  wanName: string;

  @ApiProperty({
    enum: WanStatus,
    description: 'Current WAN status',
    example: WanStatus.ONLINE,
  })
  wanStatus: WanStatus;

  @ApiProperty({
    enum: PrepaidUsageMode,
    description: 'Prepaid usage settings',
    example: PrepaidUsageMode.ALLOW,
  })
  prepaidUsageMode: PrepaidUsageMode;

  @ApiProperty({
    enum: DhcpStatus,
    description: 'DHCP status: ENABLED or DISABLED (fixed IP settings)',
    example: DhcpStatus.ENABLED,
  })
  dhcp: DhcpStatus;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Primary DNS server IP address',
    example: '8.8.8.8',
  })
  dns1: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Secondary DNS server IP address',
    example: '8.8.4.4',
  })
  dns2: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Unique identifier for the interface',
    example: 'eth0',
  })
  interfaceId: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'IP address assigned to the interface',
    example: '192.168.1.1',
  })
  ipAddress: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Gateway IP address',
    example: '192.168.1.254',
  })
  ipGateway: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Maximum bytes allowed for prepaid usage if limited',
    example: 1073741824, // 1GB
  })
  prepaidUsageMaxVolume: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: UsagePeriodType,
    description: 'Period type for prepaid usage',
    example: UsagePeriodType.MONTHLY,
  })
  prepaidUsagePeriodType: UsagePeriodType | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Subnet mask',
    example: '255.255.255.0',
  })
  subnetmask: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Autoswitching priority (1 is highest)',
    example: 1,
  })
  switchPriority: number | null;

  @ApiProperty({
    description:
      'Usage blocked status: 0=Not blocked, >0=Timestamp when blocking started',
    example: 0,
  })
  usageBlocked: number;

  @ApiProperty({
    description: 'Amount of data used in bytes',
    example: 5368709120, // 5GB
  })
  usageInBytes: number;

  @ApiProperty({
    enum: UsageLimitStatus,
    description: 'Usage limit status',
    example: UsageLimitStatus.LIMIT_ENFORCED,
  })
  usageLimitStatus: UsageLimitStatus;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Maximum number of bytes allowed',
    example: 107374182400, // 100GB
  })
  maxUsageInBytes: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Number of days for the usage period',
    example: 30,
  })
  usagePeriodInDays: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: UsagePeriodType,
    description: 'Usage period type',
    example: UsagePeriodType.MONTHLY,
  })
  usagePeriodType: UsagePeriodType | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Start of current usage accounting period',
    example: '2023-01-01T00:00:00Z',
  })
  usageStart: Date | null;
}
