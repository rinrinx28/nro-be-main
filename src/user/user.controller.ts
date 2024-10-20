import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateEConfig, UpdateEConfig } from './dto/dto';
import { SocketClientService } from 'src/socket/socket.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/econfig/create')
  async createEConfig(@Body() body: CreateEConfig) {
    return await this.userService.createConfig(body);
  }

  @Post('/econfig/update')
  async updateEConfig(@Body() body: UpdateEConfig) {
    return await this.userService.updateConfig(body);
  }

  @Get('/history/bet')
  async historyBet(@Req() req: any) {
    const user = req.user;
    const { page = 0, limited = 25, server = '24' } = req.query;
    return await this.userService.historyUserBet({
      ownerId: user._id.toString(),
      page: Number(page),
      limited: Number(limited),
      server,
    });
  }

  @Get('/history/active')
  async historyActive(@Req() req: any) {
    const user = req.user;
    const { page = 0, limited = 25 } = req.query;
    return await this.userService.historyUserActive({
      ownerId: user._id.toString(),
      page: Number(page),
      limited: Number(limited),
    });
  }
}
