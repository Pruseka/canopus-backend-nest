import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from 'src/user/entities';

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const request: Request = context.switchToHttp().getRequest();
    return request.user && request.user['sub'];
  },
);
