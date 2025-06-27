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
import {
  startOfDay,
  endOfDay,
  isSameMonth,
  differenceInMonths,
} from 'date-fns';
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
      return dbUsers
        .map((user) => new UserEntity(user))
        .sort((a, b) => a.name!.localeCompare(b.name!));
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
      return await this.swUserService.transformToUserEntities(
        swUsers,
        [],
        false,
      );
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
   * Get users from Snake Ways with their usage data
   * @returns Array of UserEntity objects with usage information
   */
  async getSnakeWaysUsersWithUsage(): Promise<UserEntity[]> {
    try {
      const swUsers = await this.swUserService.getAllUsers();
      const autocreditData = await this.swUserService.getAllAutocredits();

      // If we get an empty array but no error, log a warning
      if (swUsers.length === 0) {
        this.logger.warn(chalk.yellow('No users returned from Snake Ways'));
      }

      // Transform to UserEntity objects with usage data
      return await this.swUserService.transformToUserEntities(
        swUsers,
        autocreditData,
        true, // Include usage data
      );
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching users with usage from Snake Ways'),
        error,
      );
      // Re-throw the error so it propagates to the controller
      throw error;
    }
  }

  /**
   * Get all users from database with their usage data
   * @returns Array of UserEntity objects with usage information
   */
  async getUsersWithUsage(): Promise<UserEntity[]> {
    try {
      // Get users from database (these should already have usage data from sync)
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
      this.logger.error(
        chalk.red('Error fetching users with usage data from database'),
        error,
      );
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
   * Get history snapshots for all users within a date range with usage calculation
   * @param startDate Optional start date to filter snapshots (inclusive - greater than or equal to)
   * @param endDate Optional end date to filter snapshots (inclusive - less than or equal to)
   * @returns Array of UserHistorySnapshot objects with calculated usage
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
        orderBy: [{ snapshotDate: 'asc' }],
      });

      this.logger.log(
        chalk.green('Fetched user history snapshots from database'),
      );

      // Group snapshots by user ID
      const groupedByUser: Record<string, any[]> = {};
      for (const snapshot of dbSnapshots) {
        if (!groupedByUser[snapshot.userId]) {
          groupedByUser[snapshot.userId] = [];
        }
        groupedByUser[snapshot.userId].push(snapshot);
      }

      // Calculate usage for each user and enhance snapshots
      const enhancedSnapshots: any[] = [];

      for (const [userId, userSnapshots] of Object.entries(groupedByUser)) {
        if (userSnapshots.length >= 2) {
          // Sort snapshots chronologically
          userSnapshots.sort(
            (a, b) =>
              new Date(a.snapshotDate).getTime() -
              new Date(b.snapshotDate).getTime(),
          );

          const firstSnapshot = userSnapshots[0];
          const lastSnapshot = userSnapshots[userSnapshots.length - 1];

          // Calculate usage by processing all snapshots chronologically
          let totalDataUsage = 0;
          let totalTimeUsage = 0;
          let totalAutoCreditUsage = 0;
          let totalUsageDebit = 0;
          let totalUsageCredit = 0;
          let totalUsageQuota = 0;

          // Process snapshots in chronological order to track changes
          for (let i = 1; i < userSnapshots.length; i++) {
            const prevSnapshot = userSnapshots[i - 1];
            const currentSnapshot = userSnapshots[i];

            // Calculate period usage (what happened between prev and current snapshot)
            const periodDataUsage = this.calculateCreditUsage(
              prevSnapshot.dataCredit,
              currentSnapshot.dataCredit,
            );
            const periodTimeUsage = this.calculateCreditUsage(
              prevSnapshot.timeCredit,
              currentSnapshot.timeCredit,
            );
            const periodAutoCreditUsage = this.calculateDebitUsage(
              prevSnapshot.autocreditValue,
              currentSnapshot.autocreditValue,
            );
            const periodUsageDebit = this.calculateDebitUsage(
              prevSnapshot.usageDebit,
              currentSnapshot.usageDebit,
            );
            const periodUsageCredit = this.calculateCreditUsage(
              prevSnapshot.usageCredit,
              currentSnapshot.usageCredit,
            );
            const periodUsageQuota = this.calculateDebitUsage(
              prevSnapshot.usageQuota,
              currentSnapshot.usageQuota,
            );

            // Accumulate totals (only positive values represent actual usage)
            if (periodDataUsage > 0) totalDataUsage += periodDataUsage;
            if (periodTimeUsage > 0) totalTimeUsage += periodTimeUsage;
            if (periodAutoCreditUsage > 0)
              totalAutoCreditUsage += periodAutoCreditUsage;
            if (periodUsageDebit > 0) totalUsageDebit += periodUsageDebit;
            if (periodUsageCredit > 0) totalUsageCredit += periodUsageCredit;
            if (periodUsageQuota > 0) totalUsageQuota += periodUsageQuota;
          }

          // Add enhanced snapshot with calculated totals
          enhancedSnapshots.push({
            ...lastSnapshot,
            calculatedDataUsage: totalDataUsage,
            calculatedTimeUsage: totalTimeUsage,
            calculatedAutoCreditUsage: totalAutoCreditUsage,
            calculatedUsageDebit: totalUsageDebit,
            calculatedUsageCredit: totalUsageCredit,
            calculatedUsageQuota: totalUsageQuota,
            formattedDataUsage: this.formatBytes(totalDataUsage),
            formattedTimeUsage: this.formatTime(totalTimeUsage),
            formattedAutoCreditUsage: this.formatBytes(totalAutoCreditUsage),
            formattedUsageDebit: this.formatBytes(totalUsageDebit),
            formattedUsageCredit: this.formatBytes(totalUsageCredit),
            formattedUsageQuota: this.formatBytes(totalUsageQuota),
          });
        } else if (userSnapshots.length === 1) {
          // If only one snapshot, add it without usage calculation
          const snapshot = userSnapshots[0];
          enhancedSnapshots.push({
            ...snapshot,
            calculatedDataUsage: 0,
            calculatedTimeUsage: 0,
            calculatedAutoCreditUsage: 0,
            calculatedUsageDebit: 0,
            calculatedUsageCredit: 0,
            calculatedUsageQuota: 0,
            formattedDataUsage: '0 Bytes',
            formattedTimeUsage: '0 seconds',
            formattedAutoCreditUsage: '0 Bytes',
            formattedUsageDebit: '0 Bytes',
            formattedUsageCredit: '0 Bytes',
            formattedUsageQuota: '0 Bytes',
          });
        }
      }

      const snapshots = enhancedSnapshots
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((snapshot) => new UserHistorySnapshotEntity(snapshot));

      return snapshots;
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching user history from database'),
        error,
      );
      return null;
    }
  }

  /**
   * Get user history snapshots for a specific user with usage calculation
   * @param userId The ID of the user to get history for
   * @param startDate Optional start date to filter snapshots (inclusive - greater than or equal to)
   * @param endDate Optional end date to filter snapshots (inclusive - less than or equal to)
   * @returns UserHistorySnapshot object with calculated usage for the date range
   */
  async getUserHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserHistorySnapshotEntity | null> {
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
        orderBy: { snapshotDate: 'asc' },
      });

      // If we have at least 2 snapshots, calculate usage chronologically
      let enhancedSnapshot: any;

      if (dbSnapshots.length >= 2) {
        // Sort snapshots chronologically (should already be sorted, but ensure it)
        dbSnapshots.sort(
          (a, b) =>
            new Date(a.snapshotDate).getTime() -
            new Date(b.snapshotDate).getTime(),
        );

        const lastSnapshot = dbSnapshots[dbSnapshots.length - 1];

        // Calculate total usage by processing all snapshots chronologically
        let totalDataUsage = 0;
        let totalTimeUsage = 0;
        let totalUsageDebit = 0;
        let totalUsageCredit = 0;
        let totalUsageQuota = 0;

        // Process snapshots in chronological order to track changes
        for (let i = 1; i < dbSnapshots.length; i++) {
          const prevSnapshot = dbSnapshots[i - 1];
          const currentSnapshot = dbSnapshots[i];

          // Calculate period usage (what happened between prev and current snapshot)
          const periodDataUsage = this.calculateCreditUsage(
            prevSnapshot.dataCredit,
            currentSnapshot.dataCredit,
          );
          const periodTimeUsage = this.calculateCreditUsage(
            prevSnapshot.timeCredit,
            currentSnapshot.timeCredit,
          );
          const periodUsageDebit = this.calculateDebitUsage(
            prevSnapshot.usageDebit,
            currentSnapshot.usageDebit,
          );
          const periodUsageCredit = this.calculateCreditUsage(
            prevSnapshot.usageCredit,
            currentSnapshot.usageCredit,
          );
          const periodUsageQuota = this.calculateDebitUsage(
            prevSnapshot.usageQuota,
            currentSnapshot.usageQuota,
          );

          // Accumulate totals (only positive values represent actual usage)
          if (periodDataUsage > 0) totalDataUsage += periodDataUsage;
          if (periodTimeUsage > 0) totalTimeUsage += periodTimeUsage;
          if (periodUsageDebit > 0) totalUsageDebit += periodUsageDebit;
          if (periodUsageCredit > 0) totalUsageCredit += periodUsageCredit;
          if (periodUsageQuota > 0) totalUsageQuota += periodUsageQuota;
        }

        // Create enhanced snapshot with calculated totals
        enhancedSnapshot = {
          ...lastSnapshot,
          calculatedDataUsage: totalDataUsage,
          calculatedTimeUsage: totalTimeUsage,
          calculatedUsageDebit: totalUsageDebit,
          calculatedUsageCredit: totalUsageCredit,
          calculatedUsageQuota: totalUsageQuota,
          formattedDataUsage: this.formatBytes(totalDataUsage),
          formattedTimeUsage: this.formatTime(totalTimeUsage),
          formattedUsageDebit: this.formatBytes(totalUsageDebit),
          formattedUsageCredit: this.formatBytes(totalUsageCredit),
          formattedUsageQuota: this.formatBytes(totalUsageQuota),
        };
      } else if (dbSnapshots.length === 1) {
        // If only one snapshot, add it without usage calculation
        const snapshot = dbSnapshots[0];
        enhancedSnapshot = {
          ...snapshot,
          calculatedDataUsage: 0,
          calculatedTimeUsage: 0,
          calculatedUsageDebit: 0,
          calculatedUsageCredit: 0,
          calculatedUsageQuota: 0,
          formattedDataUsage: '0 Bytes',
          formattedTimeUsage: '0 seconds',
          formattedUsageDebit: '0 Bytes',
          formattedUsageCredit: '0 Bytes',
          formattedUsageQuota: '0 Bytes',
        };
      } else {
        // No snapshots found
        return null;
      }

      return new UserHistorySnapshotEntity(enhancedSnapshot);
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
  async restartUsersPolling(): Promise<{
    restarted: boolean;
    message: string;
  }> {
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

  /**
   * Attempt to restart Snake Ways snapshots polling if it has stopped
   * @returns Object indicating if polling was restarted and a status message
   */
  async restartSnapshotsPolling(): Promise<{
    restarted: boolean;
    message: string;
  }> {
    try {
      this.logger.log(
        chalk.cyan('Attempting to restart Snake Ways snapshots polling'),
      );

      const wasRestarted =
        await this.swUserService.restartSnapshotsPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold(
            'Snake Ways snapshots polling restarted successfully',
          ),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways snapshots polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message:
            'Snake Ways snapshots polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold('Failed to restart Snake Ways snapshots polling'),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart snapshots polling: ${error.message}`,
      };
    }
  }

  /**
   * Calculate credit usage (credit decreases over time: first - last)
   * @param firstValue First snapshot value
   * @param lastValue Last snapshot value
   * @returns Usage amount
   */
  private calculateCreditUsage(
    firstValue: bigint | number | undefined,
    lastValue: bigint | number | undefined,
  ): number {
    const firstBigInt =
      typeof firstValue === 'bigint' ? firstValue : BigInt(firstValue || 0);
    const lastBigInt =
      typeof lastValue === 'bigint' ? lastValue : BigInt(lastValue || 0);

    // In case the autocredit data is added monthly, the last value will be greater than the first value
    if (lastBigInt > firstBigInt) {
      return 0;
    }

    // Usage = first - last (since credit decreases as it's used)
    const usageBigInt = firstBigInt - lastBigInt;
    return Number(usageBigInt);
  }

  /**
   * Calculate debit usage (debit increases over time: last - first)
   * @param firstValue First snapshot value
   * @param lastValue Last snapshot value
   * @returns Usage amount
   */
  private calculateDebitUsage(
    firstValue: bigint | number | undefined,
    lastValue: bigint | number | undefined,
  ): number {
    const firstBigInt =
      typeof firstValue === 'bigint' ? firstValue : BigInt(firstValue || 0);
    const lastBigInt =
      typeof lastValue === 'bigint' ? lastValue : BigInt(lastValue || 0);

    // In case the data is refreshed monthly, the first value will be greater than the last value
    if (firstBigInt > lastBigInt) {
      return 0;
    }

    // Usage = last - first (since debit increases over time)
    const usageBigInt = lastBigInt - firstBigInt;
    return Number(usageBigInt);
  }

  /**
   * Format bytes to human-readable string
   * @param bytes The number of bytes to format
   * @returns Formatted string (e.g., "1.5 GB")
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format time in seconds to human-readable string
   * @param seconds The number of seconds to format
   * @returns Formatted string (e.g., "1h 30m", "45m", "30s")
   */
  private formatTime(seconds: number): string {
    if (seconds === 0) return '0 seconds';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours}h`);
    }

    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }

    if (remainingSeconds > 0 || parts.length === 0) {
      parts.push(`${remainingSeconds}s`);
    }

    return parts.join(' ');
  }
}
