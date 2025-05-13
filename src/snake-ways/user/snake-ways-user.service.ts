// src/external-service/external-user.service.ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
import { ApiProperty } from '@nestjs/swagger';
import { Observable, Subscription } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Status,
  User as PrismaUser,
  UserAccessLevel as PrismaUserAccessLevel,
} from '@prisma/client';
import { UserEntity } from '../../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { startOfDay } from 'date-fns';
const chalk = require('chalk');

/**
 * Enum for user access levels
 */
export enum UserAccessLevel {
  /** Administrator */
  ADMIN = 110,
  /** Site Administrator */
  SITE_ADMIN = 120,
  /** Site Master */
  SITE_MASTER = 125,
  /** Regular User */
  USER = 130,
  /** Prepaid User */
  PREPAID_USER = 140,
}

/**
 * Enum for auto credit status
 */
export enum AutoCreditStatus {
  /** Auto credit disabled */
  DISABLED = 0,
  /** Auto credit enabled */
  ENABLED = 1,
}

/**
 * Enum for user status
 */
export enum UserStatus {
  /** User is registered and active */
  REGISTERED = 0,
  // 1-x: Error Codes, Unixtimestamp if record is Pending
}

/**
 * Enum for portal connection status
 */
export enum PortalConnectionStatus {
  /** User not connected to captive portal */
  NOT_CONNECTED = 0,
  // > 0 unixtimestamp when user connected to portal
}

/**
 * Snake Ways User Interface
 */
export class User {
  /**
   * Access level of the user
   */
  // @ApiProperty({
  //   enum: UserAccessLevel,
  //   description:
  //     'Access level of the user: 110=Admin, 120=SiteAdmin, 125=SiteMaster, 130=User, 140=PrepaidUser',
  //   example: UserAccessLevel.USER,
  // })
  AccessLevel: UserAccessLevel;

  /**
   * Auto credit status
   */
  // @ApiProperty({
  //   enum: AutoCreditStatus,
  //   description: 'Auto credit status: 0=disabled, 1=enabled',
  //   example: AutoCreditStatus.ENABLED,
  // })
  AutoCreditEnabled: AutoCreditStatus;

  /**
   * Remaining credit in bytes
   */
  // @ApiProperty({
  //   description: 'Remaining data credit in bytes',
  //   example: 1073741824, // 1GB
  // })
  DataCredit: string;

  /**
   * Long user name
   */
  // @ApiProperty({
  //   description: 'Display name of the user',
  //   example: 'John Doe',
  // })
  DisplayName: string;

  /**
   * Login name of the user
   */
  // @ApiProperty({
  //   description: 'Login username',
  //   example: 'johndoe',
  // })
  Login: string;

  /**
   * User status
   */
  // @ApiProperty({
  //   description:
  //     'User status: 0=Registered, 1-x=Error Codes, Unixtimestamp if record is Pending',
  //   example: 0,
  // })
  Pending: UserStatus;

  /**
   * Portal connection status
   */
  // @ApiProperty({
  //   description:
  //     'Portal connection status: 0=not connected, >0=timestamp of connection',
  //   example: 0,
  // })
  PortalConnected: PortalConnectionStatus;

  /**
   * Remaining daily usage time in seconds
   */
  // @ApiProperty({
  //   description: 'Remaining daily usage time in seconds',
  //   example: 3600, // 1 hour
  // })
  TimeCredit: string;

  /**
   * Unique User ID, 32 Byte hex string
   */
  // @ApiProperty({
  //   description: 'Unique user identifier (32 byte hex string)',
  //   example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  // })
  UserID: string;
}

@Injectable()
export class SnakeWaysUserService
  extends SnakeWaysBaseService
  implements OnModuleInit, OnModuleDestroy
{
  private userPollingSubscription: Subscription;
  private userDataStream$: Observable<{ user: User[] } | null>;
  private pollingActive = false;
  private pollingIntervalInMins: number;

  constructor(
    protected readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    super(httpService);
    // Override logger with this class name
    Object.defineProperty(this, 'logger', {
      value: new Logger(SnakeWaysUserService.name),
    });

    // Get polling interval from config
    this.pollingIntervalInMins =
      this.configService.get<number>('SNAKE_WAYS_USERS_POLLING_INTERVAL') ||
      100;
  }

  /**
   * Initialize polling when module starts
   */
  async onModuleInit() {
    // this.startPollingUsers();
  }

  /**
   * Start polling users from Snake Ways
   */
  private startPollingUsers() {
    if (this.pollingActive) {
      this.logger.log(
        chalk.yellow('Users Polling is already active, not starting again'),
      );
      return;
    }

    this.pollingActive = true;

    this.logger.log(
      chalk.blue.bold(
        `Starting to poll users from Snake Ways every ${this.pollingIntervalInMins} minutes`,
      ),
    );

    this.userDataStream$ = this.createPollingObservable<{ user: User[] }>(
      '/user',
      this.pollingIntervalInMins * 1000, // Convert minutes to milliseconds
    );

    this.userPollingSubscription = this.userDataStream$.subscribe({
      next: async (data) => {
        if (data?.user) {
          await this.syncUsersWithDatabase(data.user);
        }
      },
      error: (error) => {
        // This should rarely be called since we're catching errors in the observable
        this.logger.error(
          chalk.red.bold('Unexpected error in user polling subscription'),
          error,
        );
        // Don't set pollingActive to false here to allow retries
        // Instead, log that we'll try to recover
        this.logger.warn(
          chalk.yellow.bold('Attempting to recover from polling error'),
        );
      },
      complete: () => {
        this.logger.warn(
          chalk.yellow.bold(
            'Polling users from Snake Ways completed or stopped due to max failures',
          ),
        );
        this.pollingActive = false;
      },
    });
  }

  /**
   * Attempt to restart polling if it has stopped
   * This can be called by a controller endpoint or scheduled job
   */
  public async restartPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(chalk.blue.bold('Attempting to restart user polling'));
      // Reset the service availability status
      this.resetServiceAvailability();
      // Reset the consecutive failures counter for this endpoint
      this.resetConsecutiveFailures('/user');
      // Start polling again
      this.startPollingUsers();
      return true;
    }
    return false;
  }

  /**
   * Sync received users with the database
   */
  private async syncUsersWithDatabase(snakeWaysUsers: User[]) {
    try {
      this.logger.log(
        chalk.cyan(
          `Syncing ${chalk.bold(snakeWaysUsers.length)} users from Snake Ways`,
        ),
      );

      for (const swUser of snakeWaysUsers) {
        const upsertData = this.transformToPrismaUser(swUser);

        // Upsert user - create if doesn't exist, update if it does
        const user = await this.prismaService.user.upsert(upsertData);

        this.logger.log(
          chalk.cyan(`Synced Prisma user: ${user.name} (${user.id})`),
        );

        // Check if we already have a snapshot for this user today
        const today = new Date(); // aka now
        const startOfToday = startOfDay(today);

        const existingSnapshot =
          await this.prismaService.userHistorySnapshot.findFirst({
            where: {
              userId: user.id,
              snapshotDate: {
                gte: startOfToday,
              },
            },
          });

        if (!existingSnapshot) {
          await this.prismaService.userHistorySnapshot.create({
            data: {
              userId: user.id,
              snapshotDate: today,
              dataCredit: user.dataCredit,
              timeCredit: user.timeCredit,
              status: user.status,
              portalConnectedAt: user.portalConnectedAt,
              accessLevel: user.accessLevel,
              autoCredit: user.autoCredit,
              displayName: user.displayName,
              name: user.name,
            },
          });

          this.logger.log(
            chalk.green.bold(
              `Created daily snapshot for ${user.name} (${user.id})`,
            ),
          );
        } else {
          await this.prismaService.userHistorySnapshot.update({
            where: { id: existingSnapshot.id },
            data: {
              dataCredit: user.dataCredit,
              timeCredit: user.timeCredit,
              status: user.status,
              portalConnectedAt: user.portalConnectedAt,
              accessLevel: user.accessLevel,
              autoCredit: user.autoCredit,
              displayName: user.displayName,
              name: user.name,
              snapshotDate: today,
            },
          });

          this.logger.log(
            chalk.green.bold(
              `Updated daily snapshot for ${user.name} (${user.id})`,
            ),
          );
        }
      }
      this.logger.log(chalk.green.bold('User sync completed successfully'));
    } catch (error) {
      this.logger.error(
        chalk.red.bold('Failed to sync users with database'),
        error,
      );
    }
  }

  /**
   * Transform Snake Ways user to Prisma user schema
   */
  private transformToPrismaUser(swUser: User) {
    // Map Snake Ways AccessLevel to Prisma UserAccessLevel
    const mapAccessLevel = (level: UserAccessLevel): PrismaUserAccessLevel => {
      switch (level) {
        case UserAccessLevel.ADMIN:
          return PrismaUserAccessLevel.ADMIN;
        case UserAccessLevel.SITE_ADMIN:
          return PrismaUserAccessLevel.SITE_ADMIN;
        case UserAccessLevel.SITE_MASTER:
          return PrismaUserAccessLevel.SITE_MASTER;
        case UserAccessLevel.PREPAID_USER:
          return PrismaUserAccessLevel.PREPAID_USER;
        default:
          return PrismaUserAccessLevel.USER;
      }
    };

    // Map Snake Ways Pending to Prisma Pending
    const mapStatus = (status: UserStatus): Status => {
      if (status === UserStatus.REGISTERED) return Status.REGISTERED;
      else if (status > 0 && status < UserStatus.REGISTERED)
        return Status.ERROR;
      else return Status.PENDING;
    };

    // Create a date from timestamp or now
    const portalConnectedAt =
      swUser.PortalConnected > 0
        ? new Date(swUser.PortalConnected * 1000)
        : null;

    // Convert string values to BigInt for data and time credits
    const dataCredit = BigInt(swUser.DataCredit);
    const timeCredit = BigInt(swUser.TimeCredit);

    this.logger.log(
      chalk.cyan(`Processing user: ${swUser.DisplayName} (${swUser.UserID})`),
    );

    // Create data for upsert
    return {
      where: {
        id: swUser.UserID,
      },
      update: {
        name: swUser.DisplayName,
        displayName: swUser.DisplayName,
        accessLevel: mapAccessLevel(swUser.AccessLevel),
        autoCredit: swUser.AutoCreditEnabled === AutoCreditStatus.ENABLED,
        dataCredit,
        status: mapStatus(swUser.Pending),
        portalConnectedAt,
        timeCredit,
        updatedAt: new Date(),
      },
      create: {
        id: swUser.UserID,
        email: `${swUser.Login}@example.com`,
        name: swUser.DisplayName,
        displayName: swUser.DisplayName,
        password: Math.random().toString(36).slice(-8), // Random password for initial creation
        accessLevel: mapAccessLevel(swUser.AccessLevel),
        autoCredit: swUser.AutoCreditEnabled === AutoCreditStatus.ENABLED,
        dataCredit,
        status: mapStatus(swUser.Pending),
        portalConnectedAt,
        timeCredit,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Get a list of all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await this.get<{ user: User[] }>('/user');
      return response?.user || [];
    } catch (error) {
      this.logger.error(chalk.red('Failed to get users'), error);
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Force an immediate synchronization with Snake Ways
   * @returns Object containing the number of users synchronized and the users themselves
   */
  async forceSync(): Promise<{ count: number; users: PrismaUser[] }> {
    this.logger.log(
      chalk.yellow.bold(
        'Manually triggering user synchronization with Snake Ways',
      ),
    );
    try {
      // Fetch latest users from Snake Ways
      const response = await this.get<{ user: User[] }>('/user');

      let prismaUsers: PrismaUser[] = await this.prismaService.user.findMany();

      if (!response?.user) {
        this.logger.warn(
          chalk.yellow('No users returned from Snake Ways during force sync'),
        );
        // if the external service returns no users, return the users that were already in the database
        return { count: prismaUsers.length, users: prismaUsers };
      }

      // Perform synchronization
      await this.syncUsersWithDatabase(response.user);

      this.logger.log(
        chalk.green.bold(
          `Force sync completed: ${chalk.white(response.user.length)} users synchronized`,
        ),
      );

      prismaUsers = await this.prismaService.user.findMany();

      return { count: prismaUsers.length, users: prismaUsers };
    } catch (error) {
      this.logger.error(chalk.red.bold('Force sync failed'), error);
      throw new Error(`Force synchronization failed: ${error.message}`);
    }
  }

  // Stop polling when application shuts down
  onModuleDestroy() {
    if (this.userPollingSubscription) {
      this.logger.log(chalk.blue('Stopping user polling'));
      this.userPollingSubscription.unsubscribe();
      this.pollingActive = false;
    }
  }

  /**
   * Transforms Snake Ways users to our UserEntity format for API responses
   * @param snakeWaysUsers The users from Snake Ways
   * @returns Array of UserEntity objects
   */
  transformToUserEntities(snakeWaysUsers: User[]): UserEntity[] {
    const userEntities: UserEntity[] = [];

    for (const swUser of snakeWaysUsers) {
      // Map Snake Ways AccessLevel to Prisma UserAccessLevel
      const accessLevel = (() => {
        switch (swUser.AccessLevel) {
          case UserAccessLevel.ADMIN:
            return PrismaUserAccessLevel.ADMIN;
          case UserAccessLevel.SITE_ADMIN:
            return PrismaUserAccessLevel.SITE_ADMIN;
          case UserAccessLevel.SITE_MASTER:
            return PrismaUserAccessLevel.SITE_MASTER;
          case UserAccessLevel.PREPAID_USER:
            return PrismaUserAccessLevel.PREPAID_USER;
          default:
            return PrismaUserAccessLevel.USER;
        }
      })();

      // Map Snake Ways Pending to Prisma Pending
      const status = (() => {
        if (swUser.Pending === UserStatus.REGISTERED) return Status.REGISTERED;
        else if (swUser.Pending > 0 && swUser.Pending < UserStatus.REGISTERED)
          return Status.ERROR;
        else return Status.PENDING;
      })();

      // Create a date from timestamp or now
      const portalConnectedAt =
        swUser.PortalConnected > 0
          ? new Date(swUser.PortalConnected * 1000)
          : null;

      // Convert string values to BigInt for display
      const dataCredit = BigInt(swUser.DataCredit);
      const timeCredit = BigInt(swUser.TimeCredit);

      // Create a UserEntity instance with constructor
      const userEntity = new UserEntity({
        id: swUser.UserID,
        email: `${swUser.Login}@example.com`,
        name: swUser.DisplayName,
        displayName: swUser.DisplayName,
        password: '**********', // Password is excluded from responses
        accessLevel: accessLevel,
        autoCredit: swUser.AutoCreditEnabled === AutoCreditStatus.ENABLED,
        dataCredit,
        status: status,
        portalConnectedAt: portalConnectedAt,
        timeCredit,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshToken: null,
      });

      userEntities.push(userEntity);
    }

    return userEntities;
  }

  //   /**
  //    * Get user by ID
  //    */
  //   async getUserById(id: string): Promise<User> {
  //     return this.get<User>(`/user/${id}`);
  //   }

  //   /**
  //    * Create a new user
  //    */
  //   async createUser(userData: Omit<User, 'id'>): Promise<User> {
  //     return this.post<User>('/user', userData);
  //   }

  //   /**
  //    * Update user information
  //    */
  //   async updateUser(id: string, userData: Partial<User>): Promise<User> {
  //     return this.put<User>(`/user/${id}`, userData);
  //   }

  //   /**
  //    * Delete a user
  //    */
  //   async deleteUser(id: string): Promise<{ success: boolean }> {
  //     return this.delete<{ success: boolean }>(`/user/${id}`);
  //   }
}
