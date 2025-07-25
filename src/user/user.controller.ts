import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  Query,
  ParseDatePipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guard';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';
import { UserHistorySnapshotEntity } from './entities/user-history-snapshot.entity';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'Returns all users from the database',
    type: [UserEntity],
  })
  @ApiOperation({ summary: 'Get all users from the database' })
  async getAllUsers(): Promise<UserEntity[]> {
    return await this.userService.getAllUsers();
  }

  @Get('snake-ways')
  @ApiResponse({
    status: 200,
    description: 'Returns all users from Snake Ways',
    type: [UserEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Get users directly from Snake Ways' })
  async getSnakeWaysUsers(): Promise<UserEntity[]> {
    try {
      return await this.userService.getSnakeWaysUsers();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Get('snake-ways-with-usage')
  @ApiResponse({
    status: 200,
    description:
      'Returns all users from Snake Ways with their current usage data',
    type: [UserEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({
    summary: 'Get users directly from Snake Ways with usage data',
  })
  async getSnakeWaysUsersWithUsage(): Promise<UserEntity[]> {
    try {
      return await this.userService.getSnakeWaysUsersWithUsage();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Get('with-usage')
  @ApiResponse({
    status: 200,
    description: 'Returns all users from database with usage data',
    type: [UserEntity],
  })
  @ApiOperation({ summary: 'Get all users with their current usage data' })
  async getUsersWithUsage(): Promise<UserEntity[]> {
    try {
      return await this.userService.getUsersWithUsage();
    } catch (error) {
      // Let NestJS handle the error with its built-in exception filter
      throw error;
    }
  }

  @Post('sync')
  @ApiResponse({
    status: 200,
    description: 'Force sync with Snake Ways and return results',
    type: [UserEntity],
  })
  @ApiResponse({
    status: 503,
    description: 'Snake Ways service is unavailable',
  })
  @ApiOperation({ summary: 'Force synchronization with Snake Ways' })
  async forceSyncUsers(): Promise<UserEntity[]> {
    try {
      return await this.userService.forceSyncUsers();
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
    return await this.userService.restartUsersPolling();
  }

  @Post('restart-snapshots-polling')
  @ApiResponse({
    status: 200,
    description: 'Restart Snake Ways snapshots polling if it has stopped',
    schema: {
      type: 'object',
      properties: {
        restarted: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Polling restarted successfully' },
      },
    },
  })
  @ApiOperation({
    summary: 'Restart Snake Ways snapshots polling if it has stopped',
  })
  async restartSnapshotsPolling(): Promise<{
    restarted: boolean;
    message: string;
  }> {
    return await this.userService.restartSnapshotsPolling();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiResponse({
    status: 200,
    description: 'Returns the currently logged in user',
    type: UserEntity,
  })
  @ApiOperation({ summary: 'Get the current user profile' })
  getMe(@Req() req: Request) {
    return req.user || null;
  }

  // @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiResponse({
    status: 200,
    description: 'Returns all historical snapshots',
    type: [UserHistorySnapshotEntity],
  })
  @ApiOperation({ summary: 'Get all historical snapshots' })
  async getHistory(
    @Query('startDate', new ParseDatePipe({ optional: true })) startDate?: Date,
    @Query('endDate', new ParseDatePipe({ optional: true })) endDate?: Date,
  ) {
    return await this.userService.getHistory(startDate, endDate);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('history/:userId')
  @ApiResponse({
    status: 200,
    description: 'Returns historical snapshots for a specific user',
    type: [UserHistorySnapshotEntity],
  })
  @ApiOperation({ summary: 'Get user history snapshots' })
  async getUserHistory(
    @Param('userId') userId: string,
    @Query('startDate', new ParseDatePipe({ optional: true })) startDate?: Date,
    @Query('endDate', new ParseDatePipe({ optional: true })) endDate?: Date,
  ) {
    return await this.userService.getUserHistory(userId, startDate, endDate);
  }
}
