import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  constructor() {
    super();

    // This function will be called after the validate function, for debugging purposes
    this.handleRequest = (err, user, info, context) => {
      if (err || !user) {
        throw new UnauthorizedException({
          statusCode: 409,
          message: 'Refresh token expired or invalid',
        });
      }

      return user;
    };
  }
}
