import { ApiProperty } from '@nestjs/swagger';
import {
  Status,
  User,
  UserAccessLevel,
  AutocreditDefinition,
  AutocreditInterval,
  AutocreditType,
  AutocreditStatus,
} from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity
  implements
    Omit<
      User,
      | 'dataCredit'
      | 'timeCredit'
      | 'autocreditValue'
      | 'usageDebit'
      | 'usageCredit'
      | 'usageQuota'
      | 'lastUsageUpdate'
    >
{
  constructor(partial: Partial<any> = {}) {
    Object.assign(this, partial);

    // Handle bigint conversion for serialization
    if (partial && partial.dataCredit !== undefined) {
      // Handle if it's a bigint
      if (typeof partial.dataCredit === 'bigint') {
        this.dataCredit = Number(partial.dataCredit);
      } else {
        this.dataCredit = Number(partial.dataCredit);
      }
    }

    if (partial && partial.timeCredit !== undefined) {
      // Handle if it's a bigint
      if (typeof partial.timeCredit === 'bigint') {
        this.timeCredit = Number(partial.timeCredit);
      } else {
        this.timeCredit = Number(partial.timeCredit);
      }
    }

    if (partial && partial.autocreditValue !== undefined) {
      // Handle if it's a bigint
      if (typeof partial.autocreditValue === 'bigint') {
        this.autocreditValue = Number(partial.autocreditValue);
      } else {
        this.autocreditValue = Number(partial.autocreditValue);
      }
    }

    // Handle usage fields BigInt conversion
    if (partial && partial.usageDebit !== undefined) {
      if (typeof partial.usageDebit === 'bigint') {
        this.usageDebit = Number(partial.usageDebit);
      } else {
        this.usageDebit = Number(partial.usageDebit);
      }
    }

    if (partial && partial.usageCredit !== undefined) {
      if (typeof partial.usageCredit === 'bigint') {
        this.usageCredit = Number(partial.usageCredit);
      } else {
        this.usageCredit = Number(partial.usageCredit);
      }
    }

    if (partial && partial.usageQuota !== undefined) {
      if (typeof partial.usageQuota === 'bigint') {
        this.usageQuota = Number(partial.usageQuota);
      } else {
        this.usageQuota = Number(partial.usageQuota);
      }
    }

    // Ensure usage fields have default values if not provided
    if (this.usageDebit === undefined) this.usageDebit = 0;
    if (this.usageCredit === undefined) this.usageCredit = 0;
    if (this.usageQuota === undefined) this.usageQuota = 0;
  }

  @ApiProperty({
    description: 'Unique user identifier',
    example: 'clj5abcde12345',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Full name of the user',
    example: 'John Doe',
  })
  name: string | null;

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
    required: false,
    nullable: true,
    description: 'Refresh token for JWT authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string | null;

  @Exclude()
  password: string;

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
    required: false,
    nullable: true,
    description: 'Display name shown in UI',
    example: 'Johnny',
  })
  displayName: string | null;

  @ApiProperty({
    enum: Status,
    description: 'User status',
    example: Status.REGISTERED,
  })
  status: Status;

  @ApiProperty({
    description:
      'When the user last connected to the portal. Null means user not connected to captive portal',
    example: '2023-05-15T10:30:00Z',
    default: null,
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
}
