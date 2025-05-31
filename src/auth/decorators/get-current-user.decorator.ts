import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserEntity } from 'src/user/entities';

export const GetCurrentUser = createParamDecorator(
  (
    data: keyof UserEntity | undefined,
    context: ExecutionContext,
  ): UserEntity | UserEntity[keyof UserEntity] => {
    const request: Request = context.switchToHttp().getRequest();
    if (!data) {
      return request.user as UserEntity;
    }
    return request.user![data] as keyof UserEntity;
  },
);
