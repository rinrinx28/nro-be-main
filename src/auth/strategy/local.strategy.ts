import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      passReqToCallback: true, // Cho phép truy cập vào req để lấy custom fields
    }); // by default expects 'username' and 'password'
  }

  async validate(
    req: Request,
    username: string,
    password: string,
  ): Promise<any> {
    const hash = req.body['hash'];
    return await this.authService.validateUser(username, password, hash);
  }
}
