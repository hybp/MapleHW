import { SetMetadata } from '@nestjs/common';
import { Role } from '../roles.enum'; // Relative path to Role enum in event-server/src/auth/roles.enum.ts

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles); 
 
 