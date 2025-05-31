import { ApiProperty } from '@nestjs/swagger';
import { LanUsage } from '@prisma/client';

// Define nested lan and wan types for better typing
export class LanInfo {
  @ApiProperty({
    description: 'LAN name',
    example: 'BUSINESS',
  })
  lanName: string;
}

export class WanInfo {
  @ApiProperty({
    description: 'WAN name',
    example: 'STARLINK',
  })
  wanName: string;
}

export class LanUsageEntity implements Omit<LanUsage, 'bytes'> {
  constructor(partial: Partial<any>) {
    Object.assign(this, partial);

    // Handle bigint conversion for serialization
    if (partial.bytes !== undefined) {
      if (typeof partial.bytes === 'bigint') {
        this.bytes = Number(partial.bytes);
      } else {
        this.bytes = Number(partial.bytes);
      }
    }

    // Create nested lan and wan objects for proper typegen
    if (partial.lan || partial.lanName) {
      this.lan = {
        lanName: partial.lan?.lanName || partial.lanName,
      };
    }

    if (partial.wan || partial.wanName) {
      this.wan = {
        wanName: partial.wan?.wanName || partial.wanName,
      };
    }

    // Keep the flat properties for backward compatibility
    this.lanName = partial.lan?.lanName || partial.lanName;
    this.wanName = partial.wan?.wanName || partial.wanName;
  }

  @ApiProperty({
    description: 'Unique identifier for the LAN usage record',
    example: 'clj5abcde12345',
  })
  id: string;

  @ApiProperty({
    description: 'LAN ID associated with this usage record',
    example: 'clj5abcde12345',
  })
  lanId: string;

  @ApiProperty({
    description: 'WAN ID associated with this usage record',
    example: 'clj5abcde12345',
  })
  wanId: string;

  @ApiProperty({
    description: 'When the record was created',
    example: '2023-05-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the record was last updated',
    example: '2023-05-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Date when this snapshot was taken',
    example: '2023-05-15T00:00:00Z',
  })
  snapshotDate: Date;

  @ApiProperty({
    description: 'Start time of the usage period',
    example: '2023-05-01T00:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'End time of the usage period (null if still active)',
    example: '2023-05-15T00:00:00Z',
    required: false,
    nullable: true,
  })
  endTime: Date | null;

  @ApiProperty({
    description: 'Bytes used during this period',
    example: 214697155,
  })
  bytes: number;

  @ApiProperty({
    description: 'LAN name for display purposes',
    example: 'BUSINESS',
    required: false,
  })
  lanName?: string;

  @ApiProperty({
    description: 'WAN name for display purposes',
    example: 'STARLINK',
    required: false,
  })
  wanName?: string;

  @ApiProperty({
    description: 'LAN information',
    type: LanInfo,
    required: false,
  })
  lan?: LanInfo;

  @ApiProperty({
    description: 'WAN information',
    type: WanInfo,
    required: false,
  })
  wan?: WanInfo;

  @ApiProperty({
    description: 'Human-readable formatted bytes used',
    example: '204.75 MB',
    required: false,
  })
  get formattedBytes(): string {
    return this.formatBytes(this.bytes);
  }

  @ApiProperty({
    description: 'Usage percentage relative to other LANs on the same WAN',
    example: 20.5,
    required: false,
  })
  usagePercentage?: number;

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
