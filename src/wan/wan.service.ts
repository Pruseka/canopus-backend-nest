import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnakeWaysWanService } from 'src/snake-ways/wan/snake-ways-wan.service';
import { WanEntity } from './entities';
const chalk = require('chalk');

@Injectable()
export class WanService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WanService.name);
  constructor(
    private swWanService: SnakeWaysWanService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log(chalk.blue('WanService initialized'));
  }

  async onModuleDestroy() {
    this.logger.log(chalk.blue('WanService destroyed'));
  }

  /**
   * Get all wans from the database
   * @returns Array of PrismaWan objects
   */
  async getAllWans(): Promise<WanEntity[]> {
    try {
      // Get wans from database
      const dbWans = await this.prisma.wan.findMany();

      if (dbWans === null) {
        this.logger.warn(
          chalk.yellow('Database unavailable. Returning empty wan list.'),
        );
        return [];
      }

      return dbWans.map((wan) => new WanEntity(wan));
    } catch (error) {
      this.logger.error(chalk.red('Error fetching wans from database'), error);
      throw error;
    }
  }

  /**
   * Get wans from Snake Ways and return as WanEntity objects
   * @returns Array of WanEntity objects representing Snake Ways wans
   */
  async getSnakeWaysWans(): Promise<WanEntity[]> {
    try {
      const swWans = await this.swWanService.getAllWans();

      // If we get an empty array but no error, log a warning
      if (swWans.length === 0) {
        this.logger.warn(chalk.yellow('No wans returned from Snake Ways'));
      }

      // Transform to WanEntity objects using the SnakeWaysWanService
      return this.swWanService.transformToWanEntities(swWans);
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching wans from Snake Ways'),
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
  async forceSyncWans(): Promise<WanEntity[]> {
    try {
      this.logger.log(chalk.cyan('Forcing synchronization with Snake Ways'));
      const result = await this.swWanService.forceSync();

      const wans = result.wans.map((wan) => new WanEntity(wan));

      return wans;
    } catch (error) {
      this.logger.error(
        chalk.red('Error during force sync with Snake Ways'),
        error,
      );
      throw error;
    }
  }

  /**
   * Attempt to restart Snake Ways polling if it has stopped
   * @returns Object indicating if polling was restarted and a status message
   */
  async restartPolling(): Promise<{ restarted: boolean; message: string }> {
    try {
      this.logger.log(
        chalk.cyan('Attempting to restart Snake Ways WAN service polling'),
      );

      const wasRestarted = await this.swWanService.restartPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold(
            'Snake Ways WAN service polling restarted successfully',
          ),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways WAN service polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message: 'WAN service polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold('Failed to restart Snake Ways WAN service polling'),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart WAN service polling: ${error.message}`,
      };
    }
  }
}
