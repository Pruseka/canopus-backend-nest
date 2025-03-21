import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';

export const GetCurrentUser = createParamDecorator(
  (
    data: keyof User | undefined,
    context: ExecutionContext,
  ): User | User[keyof User] => {
    const request: Request = context.switchToHttp().getRequest();
    if (!data) {
      return request.user as User;
    }
    return request.user![data] as keyof User;
  },
);
