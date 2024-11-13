import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
  UseFilters,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Resigter } from './dto/dto.auth';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // This uses the local strategy to log in
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('relogin')
  async relogin(@Request() req, @Body() body: any) {
    const user = req.user;
    // Kiểm tra dấu vân tay của thiết bị
    const isValidFingerprint = await this.authService.checkFinger(
      body.hash,
      user._id.toString(),
    );

    if (!isValidFingerprint) {
      throw new UnauthorizedException(
        'Bạn chỉ có thể sở hữu tối đa 2 Tài khoản trên một địa chỉ',
      );
    }

    // Nếu tất cả đều hợp lệ, trả về thông tin người dùng
    return user;
  }

  @Post('/resigter')
  async resigter(@Body() body: Resigter) {
    return this.authService.resigter(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/change/pwd')
  async cangePWD(@Body() body: any, @Req() req: any) {
    const user = req.user;
    return this.authService.changePwd({ ...body, uid: user._id });
  }
}
