import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InterfaceService } from './interface.service';
import { NetworkInterfaceEntity } from './entities';

@ApiTags('INTERFACES')
@Controller('interfaces')
export class InterfaceController {
  constructor(private readonly interfaceService: InterfaceService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns all network interfaces from the database',
    type: [NetworkInterfaceEntity],
  })
  @ApiOperation({ summary: 'Get all network interfaces from the database' })
  async getAllInterfaces(): Promise<NetworkInterfaceEntity[]> {
    return await this.interfaceService.getAllInterfaces();
  }

  @Get('snake-ways')
  @ApiResponse({
    status: 200,
    description: 'Returns all network interfaces from Snake Ways',
    type: [NetworkInterfaceEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Get network interfaces directly from Snake Ways' })
  async getSnakeWaysInterfaces(): Promise<NetworkInterfaceEntity[]> {
    try {
      return await this.interfaceService.getSnakeWaysInterfaces();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Get('snake-ways/:id')
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Interface ID to retrieve',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a specific network interface from Snake Ways',
    type: NetworkInterfaceEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Interface not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({
    summary: 'Get a specific network interface directly from Snake Ways by ID',
  })
  async getSnakeWaysInterfaceById(
    @Param('id') id: string,
  ): Promise<NetworkInterfaceEntity> {
    const iface = await this.interfaceService.getSnakeWaysInterfaceById(id);
    if (!iface) {
      throw new Error(`Interface with ID ${id} not found`);
    }
    return iface;
  }

  @Post('sync')
  @ApiResponse({
    status: 200,
    description: 'Force sync with Snake Ways and return results',
    type: [NetworkInterfaceEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Force synchronization with Snake Ways' })
  async forceSyncInterfaces(): Promise<NetworkInterfaceEntity[]> {
    try {
      return await this.interfaceService.forceSyncInterfaces();
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
    return await this.interfaceService.restartPolling();
  }
}
