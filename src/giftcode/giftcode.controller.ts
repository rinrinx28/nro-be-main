import { Controller, UseGuards } from '@nestjs/common';
import { GiftcodeService } from './giftcode.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/admin/enums/roles.guard';

@Controller('giftcode')
@UseGuards(JwtAuthGuard, RolesGuard) // Combine guards
export class GiftcodeController {
  constructor(private readonly giftcodeService: GiftcodeService) {}
}
