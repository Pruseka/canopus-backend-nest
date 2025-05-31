import {
  Controller,
  Get,
  Logger,
  Param,
  ParseArrayPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AggregatedWanUsage } from '../snake-ways/wan-usage/snake-ways-wan-usage.service';
import { WanUsageChartResponseDto } from './dto';
import { WanUsageEntity } from './entities/wan-usage.entity';
import { WanUsageService } from './wan-usage.service';

@ApiTags('wan-usage')
@Controller('wan-usage')
export class WanUsageController {
  private readonly logger = new Logger(WanUsageController.name);

  constructor(private readonly wanUsageService: WanUsageService) {}

  @Get()
  //   @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get WAN usage entities with filtering options' })
  @ApiQuery({ name: 'wanId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns WAN usage entities',
    type: [WanUsageEntity],
  })
  async getWanUsage(
    @Query('wanId') wanId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('limit') limit?: number,
  ): Promise<WanUsageEntity[]> {
    return this.wanUsageService.getWanUsageEntities({
      wanId,
      startDate,
      endDate,
      limit,
    });
  }

  @Get('chart/:period')
  //   @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get WAN usage data for charts' })
  @ApiQuery({
    name: 'wanIds',
    required: false,
    type: [String],
    description:
      'Array of WAN IDs to include in the chart data (comma-separated)',
    isArray: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns WAN usage chart data',
    type: WanUsageChartResponseDto,
  })
  async getWanUsageChartData(
    @Param('period') period: 'daily' | 'weekly' | 'monthly',
    @Query(
      'wanIds',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    wanIds?: string[],
  ): Promise<WanUsageChartResponseDto> {
    this.logger.log(
      `Getting ${period} chart data for WANs: ${wanIds?.join(', ') || 'all'}`,
    );
    return this.wanUsageService.getWanUsageChartData(period, wanIds);
  }

  //! Unused in the UI
  @Get('aggregated/:period')
  //   @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get aggregated WAN usage data' })
  @ApiQuery({
    name: 'wanIds',
    required: false,
    type: [String],
    description:
      'Array of WAN IDs to include in the aggregated data (comma-separated)',
    isArray: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns aggregated WAN usage data',
    type: [Object],
  })
  async getAggregatedWanUsage(
    @Param('period') period: 'daily' | 'weekly' | 'monthly',
    @Query(
      'wanIds',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    wanIds?: string[],
  ): Promise<AggregatedWanUsage[]> {
    this.logger.log(
      `Getting ${period} aggregated data for WANs: ${wanIds?.join(', ') || 'all'}`,
    );
    return this.wanUsageService.getAggregatedData(period, wanIds);
  }
}
