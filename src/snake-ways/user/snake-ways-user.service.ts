// src/external-service/external-user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SnakeWaysBaseService } from '../snake-ways-base.service';

/**
 * Snake Ways User Interface
 */
export interface User {
  /**
   * Access level of the user
   * 110=Admin, 120=SiteAdmin, 125=SiteMaster, 130=User, 140=PrepaidUser
   */
  AccessLevel: number;

  /**
   * Auto credit status
   * 0: no autocredit, 1 = autocredit enabled if defined
   */
  AutoCreditEnabled: number;

  /**
   * Remaining credit in bytes
   */
  DataCredit: number;

  /**
   * Long user name
   */
  DisplayName: string;

  /**
   * Login name of the user
   */
  Login: string;

  /**
   * User status
   * 0: Registered, 1-x: Error Codes, Unixtimestamp if record is Pending
   */
  Pending: number;

  /**
   * Portal connection status
   * 0: user not connected to captive portal, > 0 unixtimestamp when user connected to portal
   */
  PortalConnected: number;

  /**
   * Remaining daily usage time in seconds
   */
  TimeCredit: number;

  /**
   * Unique User ID, 32 Byte hex string
   */
  UserID: string;
}

@Injectable()
export class SnakeWaysUserService extends SnakeWaysBaseService {
  constructor(protected readonly httpService: HttpService) {
    super(httpService);
    // Override logger with this class name
    Object.defineProperty(this, 'logger', {
      value: new Logger(SnakeWaysUserService.name),
    });
  }

  /**
   * Get a list of all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.get<User[]>('/user');
      return users || [];
    } catch (error) {
      this.logger.error('Failed to get users', error);
      return [];
    }
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
