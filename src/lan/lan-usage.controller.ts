import {
  Controller,
  Get,
  Logger,
  Query,
  ParseDatePipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { LanUsageEntity } from './entities/lan-usage.entity';
import { LanUsageService, LanWithUsage } from './lan-usage.service';
import { LanUsageQueryDto, LanWithUsageDto, LanWithUsageQueryDto } from './dto';

@ApiTags('lan-usage')
@Controller('lan-usage')
export class LanUsageController {
  private readonly logger = new Logger(LanUsageController.name);

  constructor(private readonly lanUsageService: LanUsageService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get LAN usage entities with filtering options' })
  @ApiResponse({
    status: 200,
    description: 'Returns LAN usage entities',
    type: [LanUsageEntity],
  })
  async getLanUsage(
    @Query() query: LanUsageQueryDto,
  ): Promise<LanUsageEntity[]> {
    const { lanId, wanId, startDate, endDate, limit } = query;
    return this.lanUsageService.getLanUsageEntities({
      lanId,
      wanId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });
  }

  @Get('with-details')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get LANs with their usage data' })
  @ApiResponse({
    status: 200,
    description: 'Returns LANs with their usage data',
    type: [LanWithUsageDto],
  })
  @ApiQuery({
    name: 'query',
    required: false,
    type: LanWithUsageQueryDto,
    description: 'Filter by WAN ID',
  })
  async getLansWithUsage(
    @Query() query: LanWithUsageQueryDto,
  ): Promise<LanWithUsageDto[]> {
    const { wanId, startDate, endDate } = query;
    this.logger.log(
      `Getting LANs with usage data for WAN: ${wanId || 'all'}, from ${startDate} to ${endDate}`,
    );
    return this.lanUsageService.getLansWithUsage({
      wanId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    }) as Promise<LanWithUsageDto[]>;
  }
}
