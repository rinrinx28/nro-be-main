import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  handleRequest(err, user, info, context: ExecutionContext) {
    // Handle any errors that occur during authentication
    if (err || !user) {
      if (err) {
        // If Passport throws an error, return it
        throw err;
      } else if (info) {
        // If info contains error information from Passport, like invalid credentials
        throw new UnauthorizedException(
          info.message || 'Authentication failed',
        );
      }

      // If no user was found, return a default error
      throw new UnauthorizedException('Invalid credentials');
    }

    // If no errors and user is authenticated, return the user
    return user;
  }
}
