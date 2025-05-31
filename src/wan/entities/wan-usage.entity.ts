import { ApiProperty } from '@nestjs/swagger';
import { WanUsage } from '@prisma/client';

export class WanUsageEntity implements Omit<WanUsage, 'bytes' | 'maxBytes'> {
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

    if (partial.maxBytes !== undefined) {
      if (typeof partial.maxBytes === 'bigint') {
        this.maxBytes = Number(partial.maxBytes);
      } else {
        this.maxBytes = Number(partial.maxBytes);
      }
    }
  }

  @ApiProperty({
    description: 'Unique identifier for the WAN usage record',
    example: 'clj5abcde12345',
  })
  id: string;

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
    description: 'Maximum allowed usage bytes',
    example: 1073741824, // 1GB
  })
  maxBytes: number;

  @ApiProperty({
    description: 'WAN name for display purposes',
    example: 'Primary Internet Connection',
    required: false,
  })
  wanName?: string;

  @ApiProperty({
    description: 'Human-readable formatted bytes used',
    example: '204.75 MB',
    required: false,
  })
  get formattedBytes(): string {
    return this.formatBytes(this.bytes);
  }

  @ApiProperty({
    description: 'Human-readable formatted maximum bytes',
    example: '1.00 GB',
    required: false,
  })
  get formattedMaxBytes(): string {
    return this.formatBytes(this.maxBytes);
  }

  @ApiProperty({
    description: 'Usage percentage (bytes/maxBytes)',
    example: 20.5,
    required: false,
  })
  get usagePercentage(): number {
    if (!this.maxBytes) return 0;
    return (this.bytes / this.maxBytes) * 100;
  }

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
