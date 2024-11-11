import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from './enums/roles.decorator';
import { Role } from './enums/role.enum';
import { RolesGuard } from './enums/roles.guard';
import { CreateBot } from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // Combine guards
@Roles(Role.Admin) // add role admin
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create-bot')
  async create_bot(@Body() body: CreateBot) {
    return this.adminService.createBot(body);
  }

  @Post('/bulk/create-bot')
  async create_bot_bulk(@Body() body: CreateBot[]) {
    return this.adminService.createBotBulk(body);
  }
}
