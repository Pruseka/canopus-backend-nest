import { Module } from '@nestjs/common';
import { SnakeWaysBaseModule } from '../snake-ways/snake-ways-base.module';
import { WanController } from './wan.controller';
import { WanService } from './wan.service';
import { WanUsageController } from './wan-usage.controller';
import { WanUsageService } from './wan-usage.service';

@Module({
  imports: [SnakeWaysBaseModule],
  controllers: [WanController, WanUsageController],
  providers: [WanService, WanUsageService],
  exports: [WanService, WanUsageService],
})
export class WanModule {}
