import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnakeWaysLanService } from 'src/snake-ways/lan/snake-ways-lan.service';
import { LanEntity } from './entities';
const chalk = require('chalk');

@Injectable()
export class LanService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LanService.name);
  constructor(
    private swLanService: SnakeWaysLanService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log(chalk.blue('LanService initialized'));
  }

  async onModuleDestroy() {
    this.logger.log(chalk.blue('LanService destroyed'));
  }

  /**
   * Get all LANs from the database
   * @returns Array of LanEntity objects
   */
  async getAllLans(): Promise<LanEntity[]> {
    try {
      // Get LANs from database
      const dbLans = await this.prisma.lan.findMany({
        include: {
          interfaces: true,
        },
      });

      if (dbLans === null) {
        this.logger.warn(
          chalk.yellow('Database unavailable. Returning empty LAN list.'),
        );
        return [];
      }

      return dbLans.map((lan) => new LanEntity(lan));
    } catch (error) {
      this.logger.error(chalk.red('Error fetching LANs from database'), error);
      throw error;
    }
  }

  /**
   * Get LANs from Snake Ways and return as LanEntity objects
   * @returns Array of LanEntity objects representing Snake Ways LANs
   */
  async getSnakeWaysLans(): Promise<LanEntity[]> {
    try {
      const swLans = await this.swLanService.getAllLans();

      // If we get an empty array but no error, log a warning
      if (swLans.length === 0) {
        this.logger.warn(chalk.yellow('No LANs returned from Snake Ways'));
      }

      // Transform to LanEntity objects using the SnakeWaysLanService
      return this.swLanService.transformToLanEntities(swLans);
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching LANs from Snake Ways'),
        error,
      );
      // Re-throw the error so it propagates to the controller
      throw error;
    }
  }

  /**
   * Get a specific LAN by ID from Snake Ways
   * @param lanId The LAN ID to retrieve
   * @returns LanEntity for the specified LAN or null if not found
   */
  async getSnakeWaysLanById(lanId: string): Promise<LanEntity | null> {
    try {
      const swLan = await this.swLanService.getLanById(lanId);

      if (!swLan) {
        this.logger.warn(chalk.yellow(`No LAN found with ID ${lanId}`));
        return null;
      }

      // Transform to LanEntity using the SnakeWaysLanService
      const entities = this.swLanService.transformToLanEntities([swLan]);
      return entities[0] || null;
    } catch (error) {
      this.logger.error(
        chalk.red(`Error fetching LAN with ID ${lanId} from Snake Ways`),
        error,
      );
      throw error;
    }
  }

  /**
   * Force synchronization with Snake Ways and return results
   * @returns Array of synchronized LanEntity objects
   */
  async forceSyncLans(): Promise<LanEntity[]> {
    try {
      this.logger.log(chalk.cyan('Forcing synchronization with Snake Ways'));
      const result = await this.swLanService.forceSync();

      const lans = result.lans.map((lan) => new LanEntity(lan));

      return lans;
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
        chalk.cyan('Attempting to restart Snake Ways LAN service polling'),
      );

      const wasRestarted = await this.swLanService.restartPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold(
            'Snake Ways LAN service polling restarted successfully',
          ),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways LAN service polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message: 'LAN service polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold('Failed to restart Snake Ways LAN service polling'),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart LAN service polling: ${error.message}`,
      };
    }
  }
}
