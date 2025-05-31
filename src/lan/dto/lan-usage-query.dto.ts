import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LanUsageQueryDto {
  @ApiProperty({
    description: 'Filter by LAN ID',
    required: false,
    example: 'clj5abcde12345',
  })
  @IsOptional()
  @IsString()
  lanId?: string;

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

  @ApiProperty({
    description: 'Maximum number of records to return',
    required: false,
    example: 100,
  })
  @IsOptional()
  @IsNumberString()
  @Type(() => Number)
  limit?: number;
}
