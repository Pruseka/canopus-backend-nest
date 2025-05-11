import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { SnakeWaysBaseModule } from './snake-ways/snake-ways-base.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    AuthModule,
    SnakeWaysBaseModule,
    DashboardModule,
    ScheduleModule.forRoot(),
  ],

  // Applied the JwtAuthGuard to the all routes, no longer need to apply it to each route individually (e.g., @UseGuards(JwtAuthGuard))
  providers: [],
})
export class AppModule {}
