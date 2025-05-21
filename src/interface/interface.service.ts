import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnakeWaysInterfaceService } from 'src/snake-ways/interface/snake-ways-interface.service';
import { NetworkInterfaceEntity } from './entities';
const chalk = require('chalk');

@Injectable()
export class InterfaceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InterfaceService.name);
  constructor(
    private swInterfaceService: SnakeWaysInterfaceService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log(chalk.blue('InterfaceService initialized'));
  }

  async onModuleDestroy() {
    this.logger.log(chalk.blue('InterfaceService destroyed'));
  }

  /**
   * Get all network interfaces from the database
   * @returns Array of NetworkInterfaceEntity objects
   */
  async getAllInterfaces(): Promise<NetworkInterfaceEntity[]> {
    try {
      // Get interfaces from database
      const dbInterfaces = await this.prisma.networkInterface.findMany();

      if (dbInterfaces === null) {
        this.logger.warn(
          chalk.yellow('Database unavailable. Returning empty interface list.'),
        );
        return [];
      }

      return dbInterfaces.map((iface) => new NetworkInterfaceEntity(iface));
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching interfaces from database'),
        error,
      );
      throw error;
    }
  }

  /**
   * Get interfaces from Snake Ways and return as NetworkInterfaceEntity objects
   * @returns Array of NetworkInterfaceEntity objects representing Snake Ways interfaces
   */
  async getSnakeWaysInterfaces(): Promise<NetworkInterfaceEntity[]> {
    try {
      const swInterfaces = await this.swInterfaceService.getAllInterfaces();

      // If we get an empty array but no error, log a warning
      if (swInterfaces.length === 0) {
        this.logger.warn(
          chalk.yellow('No interfaces returned from Snake Ways'),
        );
      }

      // Transform SnakeWays interface data to NetworkInterfaceEntity objects
      return swInterfaces.map((swIface) => {
        // Map the interface type to the Prisma enum
        const interfaceType = this.swInterfaceService.mapInterfaceType(
          swIface.Type,
        );

        return new NetworkInterfaceEntity({
          interfaceId: swIface.InterfaceID,
          name: swIface.Name,
          status: swIface.Status,
          type: interfaceType,
          port: swIface.Port,
          vlanId: swIface.VlanID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    } catch (error) {
      this.logger.error(
        chalk.red('Error fetching interfaces from Snake Ways'),
        error,
      );
      // Re-throw the error so it propagates to the controller
      throw error;
    }
  }

  /**
   * Get a specific interface by ID from Snake Ways
   * @param interfaceId The interface ID to retrieve
   * @returns NetworkInterfaceEntity for the specified interface or null if not found
   */
  async getSnakeWaysInterfaceById(
    interfaceId: string,
  ): Promise<NetworkInterfaceEntity | null> {
    try {
      const swInterface =
        await this.swInterfaceService.getInterfaceById(interfaceId);

      if (!swInterface) {
        this.logger.warn(
          chalk.yellow(`No interface found with ID ${interfaceId}`),
        );
        return null;
      }

      // Map the interface type to the Prisma enum
      const interfaceType = this.swInterfaceService.mapInterfaceType(
        swInterface.Type,
      );

      // Create and return a NetworkInterfaceEntity
      return new NetworkInterfaceEntity({
        interfaceId: swInterface.InterfaceID,
        name: swInterface.Name,
        status: swInterface.Status,
        type: interfaceType,
        port: swInterface.Port,
        vlanId: swInterface.VlanID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(
        chalk.red(
          `Error fetching interface with ID ${interfaceId} from Snake Ways`,
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * Force synchronization with Snake Ways and return results
   * @returns Number of interfaces synchronized
   */
  async forceSyncInterfaces(): Promise<NetworkInterfaceEntity[]> {
    try {
      this.logger.log(
        chalk.cyan('Forcing interface synchronization with Snake Ways'),
      );
      const count = await this.swInterfaceService.forceSync();

      this.logger.log(chalk.green(`Synchronized ${count} interfaces`));

      // Return the updated interfaces from the database
      return this.getAllInterfaces();
    } catch (error) {
      this.logger.error(
        chalk.red('Error during interface force sync with Snake Ways'),
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
        chalk.cyan(
          'Attempting to restart Snake Ways interface service polling',
        ),
      );

      const wasRestarted =
        await this.swInterfaceService.restartPollingIfStopped();

      if (wasRestarted) {
        this.logger.log(
          chalk.green.bold(
            'Snake Ways interface service polling restarted successfully',
          ),
        );
        return {
          restarted: true,
          message: 'Polling restarted successfully',
        };
      } else {
        this.logger.log(
          chalk.yellow(
            'Snake Ways interface service polling was already active, no restart needed',
          ),
        );
        return {
          restarted: false,
          message:
            'Interface service polling was already active, no restart needed',
        };
      }
    } catch (error) {
      this.logger.error(
        chalk.red.bold(
          'Failed to restart Snake Ways interface service polling',
        ),
        error,
      );
      return {
        restarted: false,
        message: `Failed to restart interface service polling: ${error.message}`,
      };
    }
  }
}
