import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../roles.enum'; // Adjust path as necessary

// Define custom header names (ensure these match what the gateway sends)
const HEADER_USER_ID = 'x-user-id';
const HEADER_USER_ROLE = 'x-user-role';

// Define the shape of the user object we'll attach to the request
export interface AuthenticatedUser {
  userId: string;
  role: Role;
  // Add username or other fields if the gateway sends them and they are needed
}

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  private readonly logger = new Logger(HeaderAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    const userId = request.headers[HEADER_USER_ID] as string;
    const userRoleHeader = request.headers[HEADER_USER_ROLE] as string;

    if (!userId || !userRoleHeader) {
      this.logger.warn('Authentication headers missing (X-User-Id or X-User-Role)');
      throw new UnauthorizedException('Missing authentication headers');
    }

    // Validate the role against the Role enum
    // This ensures the role sent by the gateway is a valid one known to this service
    const roleValues = Object.values(Role);
    if (!roleValues.includes(userRoleHeader as Role)) {
        this.logger.warn(`Invalid role received in header: ${userRoleHeader}`);
        throw new UnauthorizedException('Invalid user role specified in header');
    }
    
    // Attach user information to the request object
    // Typescript might complain about attaching to Express.Request directly.
    // We can augment the Request type or use a more specific request type.
    // For simplicity here, we cast to any, but proper type augmentation is better.
    (request as any).user = { 
      userId, 
      role: userRoleHeader as Role 
    } as AuthenticatedUser;

    this.logger.debug(`User authenticated from headers: ${userId}, Role: ${userRoleHeader}`);
    return true;
  }
} 
 
 