import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RolesGuard } from '../guards/roles.guard';

export function Auth(...roles: Role[]) {
  return applyDecorators(SetMetadata('roles', roles), UseGuards(RolesGuard));
}
