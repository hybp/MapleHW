import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../roles.enum'; 

const HEADER_USER_ID = 'x-user-id';
const HEADER_USER_ROLE = 'x-user-role';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
}

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  private readonly logger = new Logger(HeaderAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    const userId = request.headers[HEADER_USER_ID] as string;
    const userRoleHeader = request.headers[HEADER_USER_ROLE] as string;

    if (!userId || !userRoleHeader) {
      this.logger.warn('Authentication headers missing (X-User-Id or X-User-Role) in auth-server');
      throw new UnauthorizedException('Missing authentication headers');
    }

    const roleValues = Object.values(Role);
    if (!roleValues.includes(userRoleHeader as Role)) {
        this.logger.warn(`Invalid role received in header: ${userRoleHeader} in auth-server`);
        throw new UnauthorizedException('Invalid user role specified in header');
    }
    
    (request as any).user = { 
      userId, 
      role: userRoleHeader as Role 
    } as AuthenticatedUser;

    this.logger.debug(`User authenticated from headers in auth-server: ${userId}, Role: ${userRoleHeader}`);
    return true;
  }
} 
 
 