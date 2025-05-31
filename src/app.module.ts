import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LanModule } from './lan/lan.module';
import { PrismaModule } from './prisma/prisma.module';
import { SnakeWaysBaseModule } from './snake-ways/snake-ways-base.module';
import { UserModule } from './user/user.module';
import { WanModule } from './wan/wan.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    WanModule,
    LanModule,
    AuthModule,
    SnakeWaysBaseModule,
    DashboardModule,
    ScheduleModule.forRoot(),
  ],

  // Applied the JwtAuthGuard to the all routes, no longer need to apply it to each route individually (e.g., @UseGuards(JwtAuthGuard))
})
export class AppModule {}
