import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class LanWithUsageQueryDto {
  @ApiProperty({
    description: 'Filter by WAN ID',
    required: false,
    example: '979FC0CE166A11EDA4F51737CD617E52',
  })
  @IsOptional()
  @IsString()
  wanId?: string;

  @ApiProperty({
    description: 'Start date for filtering records (YYYY-MM-DD)',
    required: false,
    example: '2025-05-18',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering records (YYYY-MM-DD)',
    required: false,
    example: '2025-05-20',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
