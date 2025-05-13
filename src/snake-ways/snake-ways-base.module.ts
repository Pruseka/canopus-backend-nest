// src/external-service/external-service.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SnakeWaysBaseService } from './snake-ways-base.service';
import { SnakeWaysUserService } from './user/snake-ways-user.service';
import * as https from 'https';
import { SnakeWaysWanService } from './wan/snake-ways-wan.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get(
          'SNAKE_WAYS_BASE_URL',
          'http://localhost:3001',
        ),
        timeout: configService.get('SNAKE_WAYS_BASE_TIMEOUT', 10000),
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': configService.get('SNAKE_WAYS_API_KEY'),
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      }),
    }),
  ],
  providers: [SnakeWaysBaseService, SnakeWaysUserService, SnakeWaysWanService],
  exports: [SnakeWaysBaseService, SnakeWaysUserService, SnakeWaysWanService],
})
export class SnakeWaysBaseModule {}
