import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
  UseFilters,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ChangePWD, Resigter } from './dto/dto.auth';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // This uses the local strategy to log in
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body() body: any) {
    return this.authService.login(req.user, body?.hash);
  }
  // This uses the local strategy to log in
  @UseGuards(JwtAuthGuard)
  @Post('relogin')
  async relogin(@Request() req, @Body() body: any) {
    await this.authService.checkFinger(body.hash);
    return req.user;
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
