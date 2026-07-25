import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../common/api-error';
import { AuthService } from './auth.service';
import type { UserDocument } from './schemas/user.schema';

export type AuthenticatedRequest = Request & { user: UserDocument };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.authService.getSession(request);
    if (!session) {
      throw new ApiError(
        401,
        'AUTH_REQUIRED',
        'A Google session is required for this action.',
      );
    }
    request.user = session.user;
    return true;
  }
}
