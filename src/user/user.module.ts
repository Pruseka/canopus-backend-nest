import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SnakeWaysBaseModule } from '../snake-ways/snake-ways-base.module';
@Module({
  imports: [SnakeWaysBaseModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
