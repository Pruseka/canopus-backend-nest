import { Module } from '@nestjs/common';
import { SnakeWaysBaseModule } from '../snake-ways/snake-ways-base.module';
import { WanController } from './wan.controller';
import { WanService } from './wan.service';
@Module({
  imports: [SnakeWaysBaseModule],
  controllers: [WanController],
  providers: [WanService],
  exports: [WanService],
})
export class WanModule {}
