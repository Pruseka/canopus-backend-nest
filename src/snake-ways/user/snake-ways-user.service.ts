// src/external-service/external-user.service.ts
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AutocreditDefinition as PrismaAutocreditDefinition,
  AutocreditInterval as PrismaAutocreditInterval,
  AutocreditStatus as PrismaAutocreditStatus,
  AutocreditType as PrismaAutocreditType,
  User as PrismaUser,
  UserAccessLevel as PrismaUserAccessLevel,
  Status,
} from '@prisma/client';
import { startOfDay, startOfMonth, differenceInDays } from 'date-fns';
import { Observable, Subscription } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UserEntity } from '../../user/entities/user.entity';
import { SnakeWaysBaseService } from '../snake-ways-base.service';
const chalk = require('chalk');

/**
 * Enum for usage record types
 */
export enum RecordType {
  UNKNOWN = 0,
  SUMMARY_RECORD = 1,
  USAGE = 2, // This is what we need for actual usage (debit)
  CREDIT = 3,
  ADJUSTMENT_DOWN = 4,
  ADJUSTMENT_UP = 5,
  AUTOCREDIT = 6,
  AUTOCREDIT_DEDUCTION = 7,
}

/**
 * Snake Ways Usage Record Interface
 */
export class UsageRecord {
  /**
   * Client MAC address
   */
  ClientMac: string;

  /**
   * Credit detail description
   */
  CreditDetail: string;

  /**
   * End time as unix timestamp
   */
  EndTime: number;

  /**
   * LAN name
   */
  LanName: string;

  /**
   * Last update timestamp
   */
  Lastupdate: number;

  /**
   * RX bytes (received/downloaded)
   */
  RX: number;

  /**
   * Record type (0-7, we need 2 for actual usage)
   */
  RecordType: RecordType;

  /**
   * Start time as unix timestamp
   */
  StartTime: number;

  /**
   * TX bytes (transmitted/uploaded)
   */
  TX: number;

  /**
   * User ID - 32 Byte hex string
   */
  UserID: string;
}

/**
 * Snake Ways Usage Response Interface
 */
export interface UsageResponse {
  usage: UsageRecord[];
}

/**
 * User Usage Summary Interface
 */
export interface UserUsageSummary {
  userId: string;
  totalDebit: number; // RX + TX from RecordType 2
  quota: number; // From autocredit
  credit: number; // quota - debit
  lastUpdate: Date;
}

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
 * Enum for autocredit definition
 */
export enum AutocreditDefinition {
  /** Not found */
  NOT_FOUND = 0,
  /** User level */
  USER = 1,
  /** Site level */
  SITE = 2,
  /** Site group level */
  SITE_GROUP = 3,
}

/**
 * Enum for autocredit interval
 */
export enum AutocreditInterval {
  /** Monthly interval */
  MONTHLY = 1,
  /** Weekly interval */
  WEEKLY = 2,
  /** Daily interval */
  DAILY = 3,
}

/**
 * Enum for autocredit type
 */
export enum AutocreditType {
  /** Add value to existing credit */
  ADD_VALUE = 1,
  /** Set credit to specific value */
  SET_TO_VALUE = 2,
}

/**
 * Enum for autocredit status
 */
export enum AutocreditStatusEnum {
  /** Autocredit disabled */
  DISABLED = 0,
  /** Autocredit enabled */
  ENABLED = 1,
}

/**
 * Snake Ways Autocredit Interface
 */
export class Autocredit {
  /**
   * Credit definition type
   */
  CreditDefinition: AutocreditDefinition;

  /**
   * Credit interval
   */
  CreditInterval: AutocreditInterval;

  /**
   * Credit type
   */
  CreditType: AutocreditType;

  /**
   * Credit value in bytes
   */
  CreditValue: number;

  /**
   * Last time credit was applied - unix timestamp
   */
  LastTopup: number;

  /**
   * Autocredit status
   */
  Status: AutocreditStatusEnum;

  /**
   * User ID - 32 Byte hex string
   */
  UserID: string;
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
    this.startPollingUsers();
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

  public async restartSnapshotsPollingIfStopped(): Promise<boolean> {
    if (!this.pollingActive) {
      this.logger.log(
        chalk.blue.bold('Attempting to restart snapshots polling'),
      );
      // Reset the service availability status
      this.resetServiceAvailability();

      this.resetConsecutiveFailures('/user/history');
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

      // Fetch autocredit data for all users
      const autocreditData = await this.getAllAutocredits();
      const autocreditMap = new Map<string, Autocredit>();

      autocreditData.forEach((autocredit) => {
        autocreditMap.set(autocredit.UserID, autocredit);
      });

      // Calculate days from start of month to current date (using same pattern as wan-usage)
      const today = new Date();
      const daysToFetch =
        differenceInDays(startOfDay(today), startOfMonth(today)) + 1;

      this.logger.log(
        chalk.cyan(
          `Fetching usage data for ${daysToFetch} days from start of month`,
        ),
      );

      for (const swUser of snakeWaysUsers) {
        const autocredit = autocreditMap.get(swUser.UserID);

        // Fetch usage data for this specific user
        const userUsageRecords = await this.getUserUsage(
          swUser.UserID,
          daysToFetch,
        );

        // Calculate usage summary for this user with validation
        const totalDebit = userUsageRecords.reduce((sum, record) => {
          const rx = Number(record.RX) || 0;
          const tx = Number(record.TX) || 0;
          return sum + rx + tx;
        }, 0);
        const quota = autocredit ? Number(autocredit.CreditValue) || 0 : 0;
        const credit = Math.max(0, quota - totalDebit);

        const usageSummary: UserUsageSummary = {
          userId: swUser.UserID,
          totalDebit,
          quota,
          credit,
          lastUpdate: new Date(),
        };

        const upsertData = this.transformToPrismaUser(
          swUser,
          autocredit,
          usageSummary,
        );

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
              autocreditDefinition: user.autocreditDefinition,
              autocreditInterval: user.autocreditInterval,
              autocreditType: user.autocreditType,
              autocreditValue: user.autocreditValue,
              autocreditLastTopup: user.autocreditLastTopup,
              autocreditStatus: user.autocreditStatus,
              usageDebit: user.usageDebit,
              usageCredit: user.usageCredit,
              usageQuota: user.usageQuota,
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
              autocreditDefinition: user.autocreditDefinition,
              autocreditInterval: user.autocreditInterval,
              autocreditType: user.autocreditType,
              autocreditValue: user.autocreditValue,
              autocreditLastTopup: user.autocreditLastTopup,
              autocreditStatus: user.autocreditStatus,
              usageDebit: user.usageDebit,
              usageCredit: user.usageCredit,
              usageQuota: user.usageQuota,
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
  private transformToPrismaUser(
    swUser: User,
    autocredit?: Autocredit,
    usageSummary?: UserUsageSummary,
  ) {
    // Import necessary Prisma enums for autocredit

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

    // Map Snake Ways Autocredit Definition to Prisma
    const mapAutocreditDefinition = (definition: AutocreditDefinition) => {
      switch (definition) {
        case AutocreditDefinition.USER:
          return PrismaAutocreditDefinition.USER;
        case AutocreditDefinition.SITE:
          return PrismaAutocreditDefinition.SITE;
        case AutocreditDefinition.SITE_GROUP:
          return PrismaAutocreditDefinition.SITE_GROUP;
        default:
          return PrismaAutocreditDefinition.NOT_FOUND;
      }
    };

    // Map Snake Ways Autocredit Interval to Prisma
    const mapAutocreditInterval = (interval: AutocreditInterval) => {
      switch (interval) {
        case AutocreditInterval.WEEKLY:
          return PrismaAutocreditInterval.WEEKLY;
        case AutocreditInterval.DAILY:
          return PrismaAutocreditInterval.DAILY;
        default:
          return PrismaAutocreditInterval.MONTHLY;
      }
    };

    // Map Snake Ways Autocredit Type to Prisma
    const mapAutocreditType = (type: AutocreditType) => {
      switch (type) {
        case AutocreditType.SET_TO_VALUE:
          return PrismaAutocreditType.SET_TO_VALUE;
        default:
          return PrismaAutocreditType.ADD_VALUE;
      }
    };

    // Map Snake Ways Autocredit Status to Prisma
    const mapAutocreditStatus = (status: AutocreditStatusEnum) => {
      switch (status) {
        case AutocreditStatusEnum.ENABLED:
          return PrismaAutocreditStatus.ENABLED;
        default:
          return PrismaAutocreditStatus.DISABLED;
      }
    };

    // Create a date from timestamp or now
    const portalConnectedAt =
      swUser.PortalConnected > 0
        ? new Date(swUser.PortalConnected * 1000)
        : null;

    // Create autocredit last topup date
    const autocreditLastTopup =
      autocredit && autocredit.LastTopup > 0
        ? new Date(autocredit.LastTopup * 1000)
        : null;

    // Convert string values to BigInt for data and time credits with validation
    const dataCredit = BigInt(Number(swUser.DataCredit) || 0);
    const timeCredit = BigInt(Number(swUser.TimeCredit) || 0);
    const autocreditValue = autocredit
      ? BigInt(Number(autocredit.CreditValue) || 0)
      : null;

    this.logger.log(
      chalk.cyan(`Processing user: ${swUser.DisplayName} (${swUser.UserID})`),
    );

    // Prepare autocredit fields
    const autocreditFields = autocredit
      ? {
          autocreditDefinition: mapAutocreditDefinition(
            autocredit.CreditDefinition,
          ),
          autocreditInterval: mapAutocreditInterval(autocredit.CreditInterval),
          autocreditType: mapAutocreditType(autocredit.CreditType),
          autocreditValue,
          autocreditLastTopup,
          autocreditStatus: mapAutocreditStatus(autocredit.Status),
        }
      : {
          autocreditDefinition: PrismaAutocreditDefinition.NOT_FOUND,
          autocreditInterval: PrismaAutocreditInterval.MONTHLY,
          autocreditType: PrismaAutocreditType.ADD_VALUE,
          autocreditValue: null,
          autocreditLastTopup: null,
          autocreditStatus: PrismaAutocreditStatus.DISABLED,
        };

    // Prepare usage fields with validation
    const usageFields = usageSummary
      ? {
          usageDebit: BigInt(
            Math.max(0, Math.floor(usageSummary.totalDebit || 0)),
          ),
          usageCredit: BigInt(
            Math.max(0, Math.floor(usageSummary.credit || 0)),
          ),
          usageQuota: BigInt(Math.max(0, Math.floor(usageSummary.quota || 0))),
        }
      : {
          usageDebit: BigInt(0),
          usageCredit: autocreditValue || BigInt(0),
          usageQuota: autocreditValue || BigInt(0),
        };

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
        ...autocreditFields,
        ...usageFields,
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
        ...autocreditFields,
        ...usageFields,
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
   * Get a list of all autocredits
   */
  async getAllAutocredits(): Promise<Autocredit[]> {
    try {
      const response = await this.get<{ autocredit: Autocredit[] }>(
        '/autocredit',
      );
      return response?.autocredit || [];
    } catch (error) {
      this.logger.error(chalk.red('Failed to get autocredits'), error);
      // Don't throw error for autocredit as it's not critical - just return empty array
      return [];
    }
  }

  /**
   * Get usage data from Snake Ways for a specific user
   * @param userId User ID to get usage for
   * @param days Number of days from start of month to current date
   */
  async getUserUsage(userId: string, days: number): Promise<UsageRecord[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('userid', userId);
      params.append('recordtype', RecordType.USAGE.toString()); // Always use recordtype 2 for actual usage

      const endpoint = `/usage?${params.toString()}`;

      const response = await this.get<UsageResponse>(endpoint);
      return response?.usage || [];
    } catch (error) {
      this.logger.error(
        chalk.red(`Failed to get usage data for user ${userId}`),
        error,
      );
      // Don't throw error for usage as it's not critical - just return empty array
      return [];
    }
  }

  //! Unused for now, just for future reference
  /**
   * Calculate usage summary for all users
   * @param usageRecords Usage records from Snake Ways
   * @param autocreditData Autocredit data for users
   * @returns Map of user usage summaries
   */
  calculateUserUsageSummaries(
    usageRecords: UsageRecord[],
    autocreditData: Autocredit[],
  ): Map<string, UserUsageSummary> {
    const usageSummaries = new Map<string, UserUsageSummary>();

    // Create autocredit map for quick lookup
    const autocreditMap = new Map<string, Autocredit>();
    autocreditData.forEach((autocredit) => {
      autocreditMap.set(autocredit.UserID, autocredit);
    });

    // Filter for actual usage records (RecordType 2)
    const actualUsageRecords = usageRecords.filter(
      (record) => record.RecordType === RecordType.USAGE,
    );

    // Group usage records by user
    const userUsageMap = new Map<string, UsageRecord[]>();
    actualUsageRecords.forEach((record) => {
      if (!userUsageMap.has(record.UserID)) {
        userUsageMap.set(record.UserID, []);
      }
      userUsageMap.get(record.UserID)!.push(record);
    });

    // Calculate summary for each user
    userUsageMap.forEach((records, userId) => {
      // Calculate total debit (RX + TX from all usage records) with validation
      const totalDebit = records.reduce((sum, record) => {
        const rx = Number(record.RX) || 0;
        const tx = Number(record.TX) || 0;
        return sum + rx + tx;
      }, 0);

      // Get quota from autocredit data with validation
      const autocredit = autocreditMap.get(userId);
      const quota = autocredit ? Number(autocredit.CreditValue) || 0 : 0;

      // Calculate remaining credit with validation
      const credit = Math.max(0, quota - totalDebit);

      // Find latest update time
      const latestUpdate = records.reduce((latest, record) => {
        const recordTime = Math.max(record.StartTime, record.EndTime);
        return recordTime > latest ? recordTime : latest;
      }, 0);

      usageSummaries.set(userId, {
        userId,
        totalDebit,
        quota,
        credit,
        lastUpdate:
          latestUpdate > 0 ? new Date(latestUpdate * 1000) : new Date(),
      });
    });

    // Add users with autocredit but no usage records with validation
    autocreditData.forEach((autocredit) => {
      if (!usageSummaries.has(autocredit.UserID)) {
        const quotaValue = Number(autocredit.CreditValue) || 0;
        usageSummaries.set(autocredit.UserID, {
          userId: autocredit.UserID,
          totalDebit: 0,
          quota: quotaValue,
          credit: quotaValue,
          lastUpdate: new Date(),
        });
      }
    });

    return usageSummaries;
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
   * @param autocreditData Optional autocredit data for the users
   * @param includeUsageData Whether to fetch and include usage data (default: false for performance)
   * @returns Array of UserEntity objects
   */
  async transformToUserEntities(
    snakeWaysUsers: User[],
    autocreditData: Autocredit[] = [],
    includeUsageData: boolean = false,
  ): Promise<UserEntity[]> {
    const autocreditMap = new Map<string, Autocredit>();
    autocreditData.forEach((autocredit) => {
      autocreditMap.set(autocredit.UserID, autocredit);
    });

    // Calculate usage data if requested
    const usageSummaryMap = new Map<string, UserUsageSummary>();
    if (includeUsageData) {
      // Calculate days from start of month to current date
      const today = new Date();
      const daysToFetch =
        differenceInDays(startOfDay(today), startOfMonth(today)) + 1;

      this.logger.log(
        chalk.cyan(
          `Fetching usage data for ${snakeWaysUsers.length} users (${daysToFetch} days)`,
        ),
      );

      // Fetch usage data for each user
      for (const swUser of snakeWaysUsers) {
        const autocredit = autocreditMap.get(swUser.UserID);
        const userUsageRecords = await this.getUserUsage(
          swUser.UserID,
          daysToFetch,
        );

        // Calculate usage summary for this user with validation
        const totalDebit = userUsageRecords.reduce((sum, record) => {
          const rx = Number(record.RX) || 0;
          const tx = Number(record.TX) || 0;
          return sum + rx + tx;
        }, 0);
        const quota = autocredit ? Number(autocredit.CreditValue) || 0 : 0;
        const credit = Math.max(0, quota - totalDebit);

        usageSummaryMap.set(swUser.UserID, {
          userId: swUser.UserID,
          totalDebit,
          quota,
          credit,
          lastUpdate: new Date(),
        });
      }
    }

    const userEntities: UserEntity[] = [];

    for (const swUser of snakeWaysUsers) {
      const autocredit = autocreditMap.get(swUser.UserID);

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

      // Map autocredit fields if available
      const autocreditDefinition = autocredit
        ? (() => {
            switch (autocredit.CreditDefinition) {
              case AutocreditDefinition.USER:
                return PrismaAutocreditDefinition.USER;
              case AutocreditDefinition.SITE:
                return PrismaAutocreditDefinition.SITE;
              case AutocreditDefinition.SITE_GROUP:
                return PrismaAutocreditDefinition.SITE_GROUP;
              default:
                return PrismaAutocreditDefinition.NOT_FOUND;
            }
          })()
        : null;

      const autocreditInterval = autocredit
        ? (() => {
            switch (autocredit.CreditInterval) {
              case AutocreditInterval.WEEKLY:
                return PrismaAutocreditInterval.WEEKLY;
              case AutocreditInterval.DAILY:
                return PrismaAutocreditInterval.DAILY;
              default:
                return PrismaAutocreditInterval.MONTHLY;
            }
          })()
        : null;

      const autocreditType = autocredit
        ? (() => {
            switch (autocredit.CreditType) {
              case AutocreditType.SET_TO_VALUE:
                return PrismaAutocreditType.SET_TO_VALUE;
              default:
                return PrismaAutocreditType.ADD_VALUE;
            }
          })()
        : null;

      const autocreditStatus = autocredit
        ? (() => {
            switch (autocredit.Status) {
              case AutocreditStatusEnum.ENABLED:
                return PrismaAutocreditStatus.ENABLED;
              default:
                return PrismaAutocreditStatus.DISABLED;
            }
          })()
        : null;

      // Create a date from timestamp or now
      const portalConnectedAt =
        swUser.PortalConnected > 0
          ? new Date(swUser.PortalConnected * 1000)
          : null;

      // Create autocredit last topup date
      const autocreditLastTopup =
        autocredit && autocredit.LastTopup > 0
          ? new Date(autocredit.LastTopup * 1000)
          : null;

      // Convert string values to BigInt for display with validation
      const dataCredit = BigInt(Number(swUser.DataCredit) || 0);
      const timeCredit = BigInt(Number(swUser.TimeCredit) || 0);
      const autocreditValue = autocredit
        ? Number(autocredit.CreditValue) || 0
        : null;

      // Get usage data for this user with validation
      const usageSummary = usageSummaryMap.get(swUser.UserID);
      const usageDebit = usageSummary
        ? Math.max(0, Math.floor(usageSummary.totalDebit || 0))
        : 0;
      const usageCredit = usageSummary
        ? Math.max(0, Math.floor(usageSummary.credit || 0))
        : autocreditValue || 0;
      const usageQuota = usageSummary
        ? Math.max(0, Math.floor(usageSummary.quota || 0))
        : autocreditValue || 0;

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
        autocreditDefinition,
        autocreditInterval,
        autocreditType,
        autocreditValue,
        autocreditLastTopup,
        autocreditStatus,
        usageDebit,
        usageCredit,
        usageQuota,
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
