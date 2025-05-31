import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { WanService } from './wan.service';
import { WanEntity } from './entities';
import { UserEntity } from 'src/user/entities';
import {
  ChangeSystemRouteDto,
  SystemRouteResponse,
} from 'src/snake-ways/wan/dto';

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

  @Get('route')
  @ApiResponse({
    status: 200,
    description: 'Returns current system route status',
    type: SystemRouteResponse,
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Get current system route status' })
  async getCurrentSystemRoute(): Promise<SystemRouteResponse> {
    try {
      return await this.wanService.getCurrentSystemRoute();
    } catch (error) {
      throw error;
    }
  }

  @Put('force-switch')
  @ApiBody({ type: ChangeSystemRouteDto })
  @ApiResponse({
    status: 200,
    description: 'System route changed successfully',
    type: SystemRouteResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid WAN ID provided',
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({
    summary: 'Change system route to specified WAN',
    description:
      'Changes the system route to the specified WAN. Use "AUTO" for automatic routing or "OFF" to disable all WAN interfaces.',
  })
  async changeSystemRoute(
    @Body() changeRouteDto: ChangeSystemRouteDto,
  ): Promise<SystemRouteResponse> {
    try {
      return await this.wanService.changeSystemRoute(changeRouteDto.wanId);
    } catch (error) {
      throw error;
    }
  }
}
