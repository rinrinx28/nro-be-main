import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MiniGameService } from './mini-game.service';
import { Cancel, Place } from './dto/dto.mini';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RedisService } from 'src/redis/redis.service';
import { Mutex } from 'async-mutex';

@Controller('mini-game')
export class MiniGameController {
  private readonly mutexMap: Map<string, Mutex> = new Map();

  constructor(
    private readonly miniGameService: MiniGameService,
    // private readonly redisProducer: RedisService,
  ) {}

  private async getMutex(key: string): Promise<Mutex> {
    if (!this.mutexMap.has(key)) {
      this.mutexMap.set(key, new Mutex());
    }
    return this.mutexMap.get(key);
  }

  @Post('/place')
  @UseGuards(JwtAuthGuard)
  async place(@Body() body: Place, @Req() req: any) {
    // const user = req.user;
    // return await this.miniGameService.placeBet({ ...body, uid: user._id });
    throw new HttpException(
      { message: 'Cổng đặt lệnh tạm đóng', code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Post('/v2/place')
  async place_bot(@Body() body: Place) {
    return await this.miniGameService.placeBet({ ...body });
  }

  @Post('/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Body() body: Cancel, @Req() req: any) {
    // const user = req.user;
    // return await this.miniGameService.cancelPlaceBet({
    //   ...body,
    //   uid: user._id,
    // });
    throw new HttpException(
      { message: 'Cổng hủy lệnh tạm đóng', code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }
}
