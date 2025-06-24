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
          // Calculate usage: first snapshot - last snapshot in the date range
          const firstSnapshot = userSnapshots[0];
          const lastSnapshot = userSnapshots[userSnapshots.length - 1];

          // Check if snapshots are within the same month
          const isWithinSameMonth = isSameMonth(
            firstSnapshot.snapshotDate,
            lastSnapshot.snapshotDate,
          );

          let safeDataUsage = 0;
          let safeTimeUsage = 0;
          let safeAutoCreditUsage = 0;
          let safeUsageDebitDiff = 0;
          let safeUsageCreditDiff = 0;
          let safeUsageQuotaDiff = 0;

          if (isWithinSameMonth) {
            // Normal calculation for same month
            safeDataUsage = Math.abs(
              this.calculateCreditUsage(
                firstSnapshot.dataCredit,
                lastSnapshot.dataCredit,
              ),
            );
            safeTimeUsage = Math.abs(
              this.calculateCreditUsage(
                firstSnapshot.timeCredit,
                lastSnapshot.timeCredit,
              ),
            );
            safeAutoCreditUsage = Math.abs(
              this.calculateDebitUsage(
                firstSnapshot.autocreditValue,
                lastSnapshot.autocreditValue,
              ),
            );
            safeUsageDebitDiff = Math.abs(
              this.calculateDebitUsage(
                firstSnapshot.usageDebit,
                lastSnapshot.usageDebit,
              ),
            );
            safeUsageCreditDiff = Math.abs(
              this.calculateCreditUsage(
                firstSnapshot.usageCredit,
                lastSnapshot.usageCredit,
              ),
            );
            safeUsageQuotaDiff = Math.abs(
              this.calculateDebitUsage(
                firstSnapshot.usageQuota,
                lastSnapshot.usageQuota,
              ),
            );
          } else {
            // Cross-month calculation
            const snapshotsOfStartMonth = userSnapshots.filter((snapshot) =>
              isSameMonth(snapshot.snapshotDate, firstSnapshot.snapshotDate),
            );
            const snapshotsOfEndMonth = userSnapshots.filter((snapshot) =>
              isSameMonth(snapshot.snapshotDate, lastSnapshot.snapshotDate),
            );

            const firstSnapshotOfStartMonth = snapshotsOfStartMonth[0];
            const firstSnapshotOfEndMonth = snapshotsOfEndMonth[0];
            const lastSnapshotOfStartMonth =
              snapshotsOfStartMonth[snapshotsOfStartMonth.length - 1];
            const lastSnapshotOfEndMonth =
              snapshotsOfEndMonth[snapshotsOfEndMonth.length - 1];

            // Calculate for each month and sum
            const startMonthDataUsage = this.calculateCreditUsage(
              firstSnapshotOfStartMonth.dataCredit,
              lastSnapshotOfStartMonth.dataCredit,
            );
            const endMonthDataUsage = this.calculateCreditUsage(
              firstSnapshotOfEndMonth.dataCredit,
              lastSnapshotOfEndMonth.dataCredit,
            );
            safeDataUsage = Math.abs(startMonthDataUsage + endMonthDataUsage);

            const startMonthTimeUsage = this.calculateCreditUsage(
              firstSnapshotOfStartMonth.timeCredit,
              lastSnapshotOfStartMonth.timeCredit,
            );
            const endMonthTimeUsage = this.calculateCreditUsage(
              firstSnapshotOfEndMonth.timeCredit,
              lastSnapshotOfEndMonth.timeCredit,
            );
            safeTimeUsage = Math.abs(startMonthTimeUsage + endMonthTimeUsage);

            const startMonthAutoCreditUsage = this.calculateDebitUsage(
              firstSnapshotOfStartMonth.autocreditValue,
              lastSnapshotOfStartMonth.autocreditValue,
            );
            const endMonthAutoCreditUsage = this.calculateDebitUsage(
              firstSnapshotOfEndMonth.autocreditValue,
              lastSnapshotOfEndMonth.autocreditValue,
            );
            safeAutoCreditUsage = Math.abs(
              startMonthAutoCreditUsage + endMonthAutoCreditUsage,
            );

            const startMonthUsageDebit = this.calculateDebitUsage(
              firstSnapshotOfStartMonth.usageDebit,
              lastSnapshotOfStartMonth.usageDebit,
            );
            const endMonthUsageDebit = this.calculateDebitUsage(
              firstSnapshotOfEndMonth.usageDebit,
              lastSnapshotOfEndMonth.usageDebit,
            );
            safeUsageDebitDiff = Math.abs(
              startMonthUsageDebit + endMonthUsageDebit,
            );

            const startMonthUsageCredit = this.calculateCreditUsage(
              firstSnapshotOfStartMonth.usageCredit,
              lastSnapshotOfStartMonth.usageCredit,
            );
            const endMonthUsageCredit = this.calculateCreditUsage(
              firstSnapshotOfEndMonth.usageCredit,
              lastSnapshotOfEndMonth.usageCredit,
            );
            safeUsageCreditDiff = Math.abs(
              startMonthUsageCredit + endMonthUsageCredit,
            );

            const startMonthUsageQuota = this.calculateDebitUsage(
              firstSnapshotOfStartMonth.usageQuota,
              lastSnapshotOfStartMonth.usageQuota,
            );
            const endMonthUsageQuota = this.calculateDebitUsage(
              firstSnapshotOfEndMonth.usageQuota,
              lastSnapshotOfEndMonth.usageQuota,
            );
            safeUsageQuotaDiff = Math.abs(
              startMonthUsageQuota + endMonthUsageQuota,
            );
          }

          // Add all snapshots for this user with calculated usage info
          enhancedSnapshots.push({
            ...lastSnapshot,
            calculatedDataUsage: safeDataUsage,
            calculatedTimeUsage: safeTimeUsage,
            calculatedAutoCreditUsage: safeAutoCreditUsage,
            calculatedUsageDebit: safeUsageDebitDiff,
            calculatedUsageCredit: safeUsageCreditDiff,
            calculatedUsageQuota: safeUsageQuotaDiff,
            formattedDataUsage: this.formatBytes(safeDataUsage),
            formattedTimeUsage: this.formatTime(safeTimeUsage),
            formattedAutoCreditUsage: this.formatBytes(safeAutoCreditUsage),
            formattedUsageDebit: this.formatBytes(safeUsageDebitDiff),
            formattedUsageCredit: this.formatBytes(safeUsageCreditDiff),
            formattedUsageQuota: this.formatBytes(safeUsageQuotaDiff),
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
        } else {
          enhancedSnapshots.push({
            ...userSnapshots[0],
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
   * @returns Array of UserHistorySnapshot objects with calculated usage
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

      // If we have at least 2 snapshots, calculate usage
      let enhancedSnapshots: any[] = [];

      if (dbSnapshots.length >= 2) {
        const firstSnapshot = dbSnapshots[0];
        const lastSnapshot = dbSnapshots[dbSnapshots.length - 1];

        // Check if snapshots are within the same month
        const isWithinSameMonth = isSameMonth(
          firstSnapshot.snapshotDate,
          lastSnapshot.snapshotDate,
        );

        let safeDataUsage = 0;
        let safeTimeUsage = 0;
        let safeUsageDebitDiff = 0;
        let safeUsageCreditDiff = 0;
        let safeUsageQuotaDiff = 0;

        if (isWithinSameMonth) {
          // Normal calculation for same month
          // Calculate data usage (bytes consumed)
          const firstDataCredit =
            typeof firstSnapshot.dataCredit === 'bigint'
              ? firstSnapshot.dataCredit
              : BigInt(firstSnapshot.dataCredit || 0);
          const lastDataCredit =
            typeof lastSnapshot.dataCredit === 'bigint'
              ? lastSnapshot.dataCredit
              : BigInt(lastSnapshot.dataCredit || 0);

          // Usage = first - last (since credit decreases as it's used)
          const dataUsageBigInt = firstDataCredit - lastDataCredit;
          const dataUsage = Number(dataUsageBigInt);
          safeDataUsage = dataUsage < 0 ? 0 : dataUsage;

          // Calculate time usage (seconds consumed)
          const firstTimeCredit =
            typeof firstSnapshot.timeCredit === 'bigint'
              ? firstSnapshot.timeCredit
              : BigInt(firstSnapshot.timeCredit || 0);
          const lastTimeCredit =
            typeof lastSnapshot.timeCredit === 'bigint'
              ? lastSnapshot.timeCredit
              : BigInt(lastSnapshot.timeCredit || 0);

          // Usage = first - last (since credit decreases as it's used)
          const timeUsageBigInt = firstTimeCredit - lastTimeCredit;
          const timeUsage = Number(timeUsageBigInt);
          safeTimeUsage = timeUsage < 0 ? 0 : timeUsage;

          // Calculate new usage field differences
          const firstUsageDebit =
            typeof firstSnapshot.usageDebit === 'bigint'
              ? firstSnapshot.usageDebit
              : BigInt(firstSnapshot.usageDebit || 0);
          const lastUsageDebit =
            typeof lastSnapshot.usageDebit === 'bigint'
              ? lastSnapshot.usageDebit
              : BigInt(lastSnapshot.usageDebit || 0);

          const firstUsageCredit =
            typeof firstSnapshot.usageCredit === 'bigint'
              ? firstSnapshot.usageCredit
              : BigInt(firstSnapshot.usageCredit || 0);
          const lastUsageCredit =
            typeof lastSnapshot.usageCredit === 'bigint'
              ? lastSnapshot.usageCredit
              : BigInt(lastSnapshot.usageCredit || 0);

          const firstUsageQuota =
            typeof firstSnapshot.usageQuota === 'bigint'
              ? firstSnapshot.usageQuota
              : BigInt(firstSnapshot.usageQuota || 0);
          const lastUsageQuota =
            typeof lastSnapshot.usageQuota === 'bigint'
              ? lastSnapshot.usageQuota
              : BigInt(lastSnapshot.usageQuota || 0);

          // Calculate usage differences (debit increases, credit decreases)
          const usageDebitDiff = Number(lastUsageDebit - firstUsageDebit);
          const usageCreditDiff = Number(firstUsageCredit - lastUsageCredit); // Credit consumed
          const usageQuotaDiff = Number(lastUsageQuota - firstUsageQuota);

          safeUsageDebitDiff = usageDebitDiff < 0 ? 0 : usageDebitDiff;
          safeUsageCreditDiff = usageCreditDiff < 0 ? 0 : usageCreditDiff;
          safeUsageQuotaDiff = usageQuotaDiff < 0 ? 0 : usageQuotaDiff;
        } else {
          // Cross-month calculation
          const snapshotsOfStartMonth = dbSnapshots.filter((snapshot) =>
            isSameMonth(snapshot.snapshotDate, firstSnapshot.snapshotDate),
          );
          const snapshotsOfEndMonth = dbSnapshots.filter((snapshot) =>
            isSameMonth(snapshot.snapshotDate, lastSnapshot.snapshotDate),
          );

          const firstSnapshotOfStartMonth = snapshotsOfStartMonth[0];
          const firstSnapshotOfEndMonth = snapshotsOfEndMonth[0];
          const lastSnapshotOfStartMonth =
            snapshotsOfStartMonth[snapshotsOfStartMonth.length - 1];
          const lastSnapshotOfEndMonth =
            snapshotsOfEndMonth[snapshotsOfEndMonth.length - 1];

          // Calculate for start month
          const startMonthDataUsage = this.calculateCreditUsage(
            firstSnapshotOfStartMonth.dataCredit,
            lastSnapshotOfStartMonth.dataCredit,
          );
          const startMonthTimeUsage = this.calculateCreditUsage(
            firstSnapshotOfStartMonth.timeCredit,
            lastSnapshotOfStartMonth.timeCredit,
          );
          const startMonthUsageDebit = this.calculateDebitUsage(
            lastSnapshotOfStartMonth.usageDebit,
            firstSnapshotOfStartMonth.usageDebit,
          );
          const startMonthUsageCredit = this.calculateCreditUsage(
            firstSnapshotOfStartMonth.usageCredit,
            lastSnapshotOfStartMonth.usageCredit,
          );
          const startMonthUsageQuota = this.calculateDebitUsage(
            firstSnapshotOfStartMonth.usageQuota,
            lastSnapshotOfStartMonth.usageQuota,
          );

          // Calculate for end month
          const endMonthDataUsage = this.calculateCreditUsage(
            firstSnapshotOfEndMonth.dataCredit,
            lastSnapshotOfEndMonth.dataCredit,
          );
          const endMonthTimeUsage = this.calculateCreditUsage(
            firstSnapshotOfEndMonth.timeCredit,
            lastSnapshotOfEndMonth.timeCredit,
          );
          const endMonthUsageDebit = this.calculateDebitUsage(
            lastSnapshotOfEndMonth.usageDebit,
            firstSnapshotOfEndMonth.usageDebit,
          );
          const endMonthUsageCredit = this.calculateCreditUsage(
            firstSnapshotOfEndMonth.usageCredit,
            lastSnapshotOfEndMonth.usageCredit,
          );
          const endMonthUsageQuota = this.calculateDebitUsage(
            firstSnapshotOfEndMonth.usageQuota,
            lastSnapshotOfEndMonth.usageQuota,
          );

          // Sum the two months
          safeDataUsage = Math.abs(startMonthDataUsage + endMonthDataUsage);
          safeTimeUsage = Math.abs(startMonthTimeUsage + endMonthTimeUsage);
          safeUsageDebitDiff = Math.abs(
            startMonthUsageDebit + endMonthUsageDebit,
          );
          safeUsageCreditDiff = Math.abs(
            startMonthUsageCredit + endMonthUsageCredit,
          );
          safeUsageQuotaDiff = Math.abs(
            startMonthUsageQuota + endMonthUsageQuota,
          );
        }

        // Add all snapshots with calculated usage info
        const snapshot = dbSnapshots[dbSnapshots.length - 1];
        enhancedSnapshots.push({
          ...snapshot,
          calculatedDataUsage: safeDataUsage,
          calculatedTimeUsage: safeTimeUsage,
          calculatedUsageDebit: safeUsageDebitDiff,
          calculatedUsageCredit: safeUsageCreditDiff,
          calculatedUsageQuota: safeUsageQuotaDiff,
          formattedDataUsage: this.formatBytes(safeDataUsage),
          formattedTimeUsage: this.formatTime(safeTimeUsage),
          formattedUsageDebit: this.formatBytes(safeUsageDebitDiff),
          formattedUsageCredit: this.formatBytes(safeUsageCreditDiff),
          formattedUsageQuota: this.formatBytes(safeUsageQuotaDiff),
        });
      } else {
        const snapshot = dbSnapshots[dbSnapshots.length - 1];

        enhancedSnapshots.push({
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
        });
      }

      return new UserHistorySnapshotEntity(enhancedSnapshots[0]);
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
