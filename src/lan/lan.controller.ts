import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LanService } from './lan.service';
import { LanEntity } from './entities';

@ApiTags('LANS')
@Controller('lans')
export class LanController {
  constructor(private readonly lanService: LanService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns all LANs from the database',
    type: [LanEntity],
  })
  @ApiOperation({ summary: 'Get all LANs from the database' })
  async getAllLans(): Promise<LanEntity[]> {
    return await this.lanService.getAllLans();
  }

  @Get('snake-ways')
  @ApiResponse({
    status: 200,
    description: 'Returns all LANs from Snake Ways',
    type: [LanEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Get LANs directly from Snake Ways' })
  async getSnakeWaysLans(): Promise<LanEntity[]> {
    try {
      return await this.lanService.getSnakeWaysLans();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Get('snake-ways/:id')
  @ApiParam({
    name: 'id',
    required: true,
    description: 'LAN ID to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a specific LAN from Snake Ways',
    type: LanEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'LAN not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({
    summary: 'Get a specific LAN directly from Snake Ways by ID',
  })
  async getSnakeWaysLanById(@Param('id') id: string): Promise<LanEntity> {
    const lan = await this.lanService.getSnakeWaysLanById(id);
    if (!lan) {
      throw new Error(`LAN with ID ${id} not found`);
    }
    return lan;
  }

  @Post('sync')
  @ApiResponse({
    status: 200,
    description: 'Force sync with Snake Ways and return results',
    type: [LanEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Force synchronization with Snake Ways' })
  async forceSyncLans(): Promise<LanEntity[]> {
    try {
      return await this.lanService.forceSyncLans();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Post('restart-polling')
  @ApiResponse({
    status: 200,
    description: 'Restart Snake Ways polling if it has stopped',
    schema: {
      type: 'object',
      properties: {
        restarted: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Polling restarted successfully' },
      },
    },
  })
  @ApiOperation({
    summary: 'Restart Snake Ways polling if it has stopped due to failures',
  })
  async restartPolling(): Promise<{ restarted: boolean; message: string }> {
    return await this.lanService.restartPolling();
  }
}
