import { ApiProperty } from '@nestjs/swagger';
import { Pending, UserAccessLevel, UserHistorySnapshot } from '@prisma/client';

export class UserHistorySnapshotEntity
  implements Omit<UserHistorySnapshot, 'timeCredit' | 'dataCredit'>
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
    enum: Pending,
    description: 'User status',
    example: Pending.REGISTERED,
  })
  pending: Pending;

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
}
