import { ApiProperty } from '@nestjs/swagger';
import {
  Status,
  UserAccessLevel,
  UserHistorySnapshot,
  AutocreditDefinition,
  AutocreditInterval,
  AutocreditType,
  AutocreditStatus,
} from '@prisma/client';

export class UserHistorySnapshotEntity
  implements
    Omit<
      UserHistorySnapshot,
      | 'timeCredit'
      | 'dataCredit'
      | 'autocreditValue'
      | 'usageDebit'
      | 'usageCredit'
      | 'usageQuota'
    >
{
  constructor(partial: Partial<any>) {
    Object.assign(this, partial);

    // Handle bigint conversion for serialization
    if (partial.dataCredit !== undefined) {
      // Handle if it's a bigint
      if (typeof partial.dataCredit === 'bigint') {
        this.dataCredit = Number(partial.dataCredit);
      } else {
        this.dataCredit = Number(partial.dataCredit);
      }
    }

    if (partial.timeCredit !== undefined) {
      // Handle if it's a bigint
      if (typeof partial.timeCredit === 'bigint') {
        this.timeCredit = Number(partial.timeCredit);
      } else {
        this.timeCredit = Number(partial.timeCredit);
      }
    }

    if (partial.autocreditValue !== undefined) {
      // Handle if it's a bigint
      if (typeof partial.autocreditValue === 'bigint') {
        this.autocreditValue = Number(partial.autocreditValue);
      } else {
        this.autocreditValue = Number(partial.autocreditValue);
      }
    }

    // Handle usage fields BigInt conversion
    if (partial.usageDebit !== undefined) {
      if (typeof partial.usageDebit === 'bigint') {
        this.usageDebit = Number(partial.usageDebit);
      } else {
        this.usageDebit = Number(partial.usageDebit);
      }
    }

    if (partial.usageCredit !== undefined) {
      if (typeof partial.usageCredit === 'bigint') {
        this.usageCredit = Number(partial.usageCredit);
      } else {
        this.usageCredit = Number(partial.usageCredit);
      }
    }

    if (partial.usageQuota !== undefined) {
      if (typeof partial.usageQuota === 'bigint') {
        this.usageQuota = Number(partial.usageQuota);
      } else {
        this.usageQuota = Number(partial.usageQuota);
      }
    }
  }

  @ApiProperty({
    description: 'Unique snapshot identifier',
    example: 'clj5abcde12345',
  })
  id: string;

  @ApiProperty({
    description: 'User ID this snapshot belongs to',
    example: 'clj5abcde12345',
  })
  userId: string;

  @ApiProperty({
    description: 'When the user was created',
    example: '2023-05-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the user was last updated',
    example: '2023-05-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date of the snapshot',
    example: '2023-05-15T00:00:00Z',
  })
  snapshotDate: Date;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Full name of the user',
    example: 'John Doe',
  })
  name: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Display name shown in UI',
    example: 'Johnny',
  })
  displayName: string | null;

  @ApiProperty({
    enum: UserAccessLevel,
    description: 'Access level of the user',
    example: UserAccessLevel.USER,
  })
  accessLevel: UserAccessLevel;

  @ApiProperty({
    description: 'Whether auto-credit is enabled for this user',
    example: true,
  })
  autoCredit: boolean;

  @ApiProperty({
    description: 'Data credit in bytes',
    example: 1073741824, // 1GB
  })
  dataCredit: number;

  @ApiProperty({
    enum: Status,
    description: 'User status',
    example: Status.REGISTERED,
  })
  status: Status;

  @ApiProperty({
    description: 'When the user last connected to the portal',
    example: '2023-05-15T10:30:00Z',
    nullable: true,
  })
  portalConnectedAt: Date | null;

  @ApiProperty({
    description: 'Time credit in seconds',
    example: 3600, // 1 hour
  })
  timeCredit: number;

  @ApiProperty({
    enum: AutocreditDefinition,
    description: 'Autocredit definition type',
    example: AutocreditDefinition.USER,
    nullable: true,
  })
  autocreditDefinition: AutocreditDefinition | null;

  @ApiProperty({
    enum: AutocreditInterval,
    description: 'Autocredit interval',
    example: AutocreditInterval.MONTHLY,
    nullable: true,
  })
  autocreditInterval: AutocreditInterval | null;

  @ApiProperty({
    enum: AutocreditType,
    description: 'Autocredit type',
    example: AutocreditType.ADD_VALUE,
    nullable: true,
  })
  autocreditType: AutocreditType | null;

  @ApiProperty({
    description: 'Autocredit value in bytes',
    example: 5368709120, // 5GB
    nullable: true,
  })
  autocreditValue: number | null;

  @ApiProperty({
    description: 'Last time autocredit was applied',
    example: '2023-05-15T10:30:00Z',
    nullable: true,
  })
  autocreditLastTopup: Date | null;

  @ApiProperty({
    enum: AutocreditStatus,
    description: 'Autocredit status',
    example: AutocreditStatus.ENABLED,
    nullable: true,
  })
  autocreditStatus: AutocreditStatus | null;

  @ApiProperty({
    description: 'Calculated data usage in bytes',
    example: 1073741824, // 1GB
  })
  calculatedDataUsage: number;

  @ApiProperty({
    description: 'Calculated time usage in seconds',
    example: 3600, // 1 hour
  })
  calculatedTimeUsage: number;

  @ApiProperty({
    description: 'Calculated auto-credit usage in bytes',
    example: 5368709120, // 5GB
  })
  calculatedAutoCreditUsage: number;

  @ApiProperty({
    description: 'Formatted data usage',
    example: '1.5 GB',
  })
  formattedDataUsage: string;

  @ApiProperty({
    description: 'Formatted time usage',
    example: '1.5 hours',
  })
  formattedTimeUsage: string;

  @ApiProperty({
    description: 'Formatted auto-credit usage',
    example: '1.5 GB',
  })
  formattedAutoCreditUsage: string;

  @ApiProperty({
    description: 'Total actual usage (debit) in bytes from RecordType 2',
    example: 1073741824, // 1GB
  })
  usageDebit: number;

  @ApiProperty({
    description: 'Remaining credit (quota - debit) in bytes',
    example: 4294967296, // 4GB
  })
  usageCredit: number;

  @ApiProperty({
    description: 'Monthly quota from autocredit in bytes',
    example: 5368709120, // 5GB
  })
  usageQuota: number;

  @ApiProperty({
    description: 'Calculated usage debit change between snapshots',
    example: 1073741824, // 1GB
  })
  calculatedUsageDebit: number;

  @ApiProperty({
    description: 'Calculated usage credit change between snapshots',
    example: 1073741824, // 1GB
  })
  calculatedUsageCredit: number;

  @ApiProperty({
    description: 'Calculated usage quota change between snapshots',
    example: 0, // Usually 0 unless quota changed
  })
  calculatedUsageQuota: number;

  @ApiProperty({
    description: 'Formatted usage debit change',
    example: '1.0 GB',
  })
  formattedUsageDebit: string;

  @ApiProperty({
    description: 'Formatted usage credit change',
    example: '1.0 GB',
  })
  formattedUsageCredit: string;

  @ApiProperty({
    description: 'Formatted usage quota change',
    example: '0 Bytes',
  })
  formattedUsageQuota: string;
}
