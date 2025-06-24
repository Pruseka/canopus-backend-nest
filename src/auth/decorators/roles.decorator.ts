import { SetMetadata } from '@nestjs/common';
import { UserAccessLevel } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserAccessLevel[]) =>
  SetMetadata(ROLES_KEY, roles);
