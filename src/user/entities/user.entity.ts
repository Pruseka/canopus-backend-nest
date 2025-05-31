import { ApiProperty } from '@nestjs/swagger';
import { Status, User, UserAccessLevel } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity implements Omit<User, 'dataCredit' | 'timeCredit'> {
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
}
