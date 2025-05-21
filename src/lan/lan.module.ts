import { Module } from '@nestjs/common';
import { LanController } from './lan.controller';
import { LanService } from './lan.service';
import { SnakeWaysBaseModule } from 'src/snake-ways/snake-ways-base.module';
import { LanUsageController } from './lan-usage.controller';
import { LanUsageService } from './lan-usage.service';

@Module({
  imports: [SnakeWaysBaseModule],
  controllers: [LanController, LanUsageController],
  providers: [LanService, LanUsageService],
  exports: [LanService, LanUsageService],
})
export class LanModule {}
