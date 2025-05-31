import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnakeWaysUserService } from 'src/snake-ways/user/snake-ways-user.service';
import { UserEntity } from './entities/user.entity';
import { UserHistorySnapshotEntity } from './entities/user-history-snapshot.entity';
import { startOfDay, endOfDay } from 'date-fns';
const chalk = require('chalk');

@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private swUserService: SnakeWaysUserService,
  ) {}

  async onModuleInit() {
    // Initialize the user service
    this.logger.log(chalk.blue('UserService initialized'));
  }

  async onModuleDestroy() {
    // Clean up the user service
    this.logger.log(chalk.blue('UserService destroyed'));
  }

  /**
   * Get all users from the database
   * @returns Array of PrismaUser objects
   */
  async getAllUsers(): Promise<UserEntity[]> {
    try {
      // Get users from database
      const dbUsers = await this.prisma.user.findMany();

      if (dbUsers === null) {
        this.logger.warn(
          chalk.yellow('Database unavailable. Returning empty user list.'),
        );
        return [];
      }

      // Transform to UserEntity objects
      return dbUsers.map((user) => new UserEntity(user));
    } catch (error) {
      this.logger.error(chalk.red('Error fetching users from database'), error);
      throw error;
    }
  }

  /**
   * Get users from Snake Ways and return as UserEntity objects
   * @returns Array of UserEntity objects representing Snake Ways users
   */
  async getSnakeWaysUsers(): Promise<UserEntity[]> {
    try {
      const swUsers = await this.swUserService.getAllUsers();

      // If we get an empty array but no error, log a warning
      if (swUsers.length === 0) {
        this.logger.warn(chalk.yellow('No users returned from Snake Ways'));
      }

      // Transform to UserEntity objects using the SnakeWaysUserService
      return this.swUserService.transformToUserEntities(swUsers);
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching users from Snake Ways'),
        error,
      );
      // Re-throw the error so it propagates to the controller
      throw error;
    }
  }

  /**
   * Force synchronization with Snake Ways and return results
   * @returns Object with count and synchronized users
   */
  async forceSyncUsers(): Promise<UserEntity[]> {
    try {
      this.logger.log(chalk.cyan('Forcing synchronization with Snake Ways'));
      const result = await this.swUserService.forceSync();

      const users = result.users.map((user) => new UserEntity(user));

      return users;
    } catch (error) {
      this.logger.error(
        chalk.red('Error during force sync with Snake Ways'),
        error,
      );
      throw error;
    }
  }

  /**
   * Get history snapshots for all users within a date range
   * @param startDate Optional start date to filter snapshots (inclusive - greater than or equal to)
   * @param endDate Optional end date to filter snapshots (inclusive - less than or equal to)
   * @returns Array of UserHistorySnapshot objects
   */
  async getHistory(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserHistorySnapshotEntity[] | null> {
    try {
      const whereClause: any = {};

      // Build date filters independently
      if (startDate || endDate) {
        whereClause.snapshotDate = {};

        if (startDate) {
          // Include from start of the startDate (00:00:00)
          whereClause.snapshotDate.gte = startOfDay(startDate);
        }

        if (endDate) {
          // Include until end of the endDate (23:59:59.999)
          whereClause.snapshotDate.lte = endOfDay(endDate);
        }
      }

      const dbSnapshots = await this.prisma.userHistorySnapshot.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
      });

      this.logger.log(
        chalk.green('Fetched user history snapshots from database'),
      );

      return dbSnapshots.map(
        (snapshot) => new UserHistorySnapshotEntity(snapshot),
      );
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching user history from database'),
        error,
      );
      return null;
    }
  }

  /**
   * Get user history snapshots for a specific user
   * @param userId The ID of the user to get history for
   * @param startDate Optional start date to filter snapshots (inclusive - greater than or equal to)
   * @param endDate Optional end date to filter snapshots (inclusive - less than or equal to)
   * @returns Array of UserHistorySnapshot objects
   */
  async getUserHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserHistorySnapshotEntity[] | null> {
    try {
      const whereClause: any = { userId };

      // Build date filters independently
      if (startDate || endDate) {
        whereClause.snapshotDate = {};

        if (startDate) {
          // Include from start of the startDate (00:00:00)
          whereClause.snapshotDate.gte = startOfDay(startDate);
        }

        if (endDate) {
          // Include until end of the endDate (23:59:59.999)
          whereClause.snapshotDate.lte = endOfDay(endDate);
        }
      }

      const dbSnapshots = await this.prisma.userHistorySnapshot.findMany({
        where: whereClause,
        orderBy: { snapshotDate: 'desc' },
      });

      return dbSnapshots.map(
        (snapshot) => new UserHistorySnapshotEntity(snapshot),
      );
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching user history from database'),
        error,
      );
      throw error;
    }
  }

  /**
   * Update user's refresh token
   * @param userId User ID
   * @param refreshToken New refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshToken: refreshToken,
      },
    });
  }

  /**
   * Attempt to restart Snake Ways polling if it has stopped
   * @returns Object indicating if polling was restarted and a status message
   */
  async restartPolling(): Promise<{ restarted: boolean; message: string }> {
    try {
      this.logger.log(chalk.cyan('Attempting to restart Snake Ways polling'));

      const wasRestarted = await this.swUserService.restartPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold('Snake Ways polling restarted successfully'),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message: 'Polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold('Failed to restart Snake Ways polling'),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart polling: ${error.message}`,
      };
    }
  }
}
