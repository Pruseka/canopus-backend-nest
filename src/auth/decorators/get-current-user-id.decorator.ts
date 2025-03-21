import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, context: ExecutionContext): User['id'] | undefined => {
    const request: Request = context.switchToHttp().getRequest();
    return (request.user as any).id;
  },
);
