import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for chart data point
 */
export class WanUsageChartDataDto {
  @ApiProperty({ description: 'Date for the data point' })
  date: Date;

  // Dynamic properties can't have decorators
  // Each key represents a WAN name with its usage value
  [wanName: string]: Date | number;
}

/**
 * DTO for metadata about each WAN in the chart
 */
export class WanChartMetadataDto {
  @ApiProperty({ description: 'WAN name' })
  name: string;

  @ApiProperty({ description: 'Total bytes used' })
  totalBytes: number;

  @ApiProperty({ description: 'Human-readable formatted total bytes' })
  formattedTotalBytes: string;

  @ApiProperty({ description: 'Optional color for the chart', required: false })
  color?: string;
}

/**
 * Response DTO for WAN usage chart data
 */
export class WanUsageChartResponseDto {
  @ApiProperty({
    description: 'Chart data points',
    type: [WanUsageChartDataDto],
  })
  data: WanUsageChartDataDto[];

  @ApiProperty({
    description: 'Metadata for each WAN in the chart',
    type: [WanChartMetadataDto],
  })
  metadata: WanChartMetadataDto[];
}

/**
 * Query params DTO for WAN usage chart
 */
export class WanUsageChartQueryDto {
  @ApiProperty({
    description: 'Array of WAN IDs to include in the chart data',
    required: false,
    isArray: true,
    type: [String],
  })
  wanIds?: string[];
}
