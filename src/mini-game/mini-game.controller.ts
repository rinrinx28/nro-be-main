import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MiniGameService } from './mini-game.service';
import { Cancel, Place } from './dto/dto.mini';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('mini-game')
export class MiniGameController {
  constructor(private readonly miniGameService: MiniGameService) {}

  @Post('/place')
  @UseGuards(JwtAuthGuard)
  async place(@Body() body: Place, @Req() req: any) {
    const user = req.user;
    return await this.miniGameService.placeBet({ ...body, uid: user._id });
  }

  @Post('/v2/place')
  async place_bot(@Body() body: Place, @Req() req: any) {
    // const user = req.user;
    return await this.miniGameService.placeBet({ ...body });
  }

  @Post('/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Body() body: Cancel, @Req() req: any) {
    const user = req.user;
    return await this.miniGameService.cancelPlaceBet({
      ...body,
      uid: user._id,
    });
  }
}
