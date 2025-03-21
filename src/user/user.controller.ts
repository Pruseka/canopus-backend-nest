import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('users')
export class UserController {
  @Get('me')
  getMe(@Req() req: Request) {
    return req.user;
  }
}
