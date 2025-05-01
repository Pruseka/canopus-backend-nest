import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnakeWaysUserService } from 'src/snake-ways/user/snake-ways-user.service';
import { User } from 'src/snake-ways/user/snake-ways-user.service';

@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private swUserService: SnakeWaysUserService,
  ) {}

  async onModuleInit() {
    // Initialize the user service
    this.logger.log('UserService initialized');
  }

  async onModuleDestroy() {
    // Clean up the user service
    this.logger.log('UserService destroyed');
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.swUserService.getAllUsers();

      if (users === null) {
        this.logger.warn(
          'External service unavailable. Returning empty user list.',
        );
        return [];
      }

      return users;
    } catch (error) {
      this.logger.error('Error fetching users', error);
      return [];
    }
  }

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
}
