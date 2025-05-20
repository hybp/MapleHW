import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../guards/header-auth.guard'; // Adjust path as necessary

/**
 * Custom decorator to extract the user object from the request.
 * The user object is populated by the HeaderAuthGuard.
 *
 * @example
 * someMethod(@User() user: AuthenticatedUser) {
 *   console.log(user.userId, user.role);
 * }
 * 
 * @example
 * someMethod(@User('userId') userId: string) {
 *  console.log(userId);
 * }
 */
export const User = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      // This should ideally not happen if HeaderAuthGuard is applied globally or on the route
      // Consider throwing an error or returning undefined based on strictness requirements
      return undefined; 
    }

    return data ? user[data] : user;
  },
); 
 
 