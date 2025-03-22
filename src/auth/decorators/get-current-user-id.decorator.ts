import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from 'src/user/entities';

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserEntity['id'] | undefined => {
    const request: Request = context.switchToHttp().getRequest();
    return (request.user as any).id;
  },
);
