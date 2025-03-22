import { Controller, Get, Req } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { UserEntity } from './entities/user.entity';

@Controller('users')
export class UserController {
  @Get('me')
  @ApiResponse({
    status: 200,
    description: 'Returns the currently logged in user',
    type: UserEntity,
  })
  getMe(@Req() req: Request) {
    return req.user;
  }
}
