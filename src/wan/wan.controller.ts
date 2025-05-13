import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WanService } from './wan.service';
import { WanEntity } from './entities';
import { UserEntity } from 'src/user/entities';

@ApiTags('WANS')
@Controller('wans')
export class WanController {
  constructor(private readonly wanService: WanService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns all wans from the database',
    type: [WanEntity],
  })
  @ApiOperation({ summary: 'Get all wans from the database' })
  async getAllWans(): Promise<WanEntity[]> {
    return await this.wanService.getAllWans();
  }

  @Get('snake-ways')
  @ApiResponse({
    status: 200,
    description: 'Returns all wans from Snake Ways',
    type: [WanEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Get wans directly from Snake Ways' })
  async getSnakeWaysWans(): Promise<WanEntity[]> {
    try {
      return await this.wanService.getSnakeWaysWans();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Post('sync')
  @ApiResponse({
    status: 200,
    description: 'Force sync with Snake Ways and return results',
    type: [WanEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Force synchronization with Snake Ways' })
  async forceSyncWans(): Promise<WanEntity[]> {
    try {
      return await this.wanService.forceSyncWans();
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
    return await this.wanService.restartPolling();
  }
}
