import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('users')
export class UserController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Returns the currently logged in user',
    type: UserEntity,
  })
  getMe(@Req() req: Request) {
    return req.user;
  }
}
