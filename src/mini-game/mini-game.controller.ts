import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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
    private readonly redisProducer: RedisService,
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
    const user = req.user;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      return await this.miniGameService.placeBet({ ...body, uid: user._id });
    } finally {
      release();
    }
  }

  @Post('/v2/place')
  async place_bot(@Body() body: Place) {
    const mutex = await this.getMutex(body.uid || 'bot');
    const release = await mutex.acquire();
    try {
      return await this.miniGameService.placeBet({ ...body });
    } finally {
      release();
    }
  }

  @Post('/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Body() body: Cancel, @Req() req: any) {
    const user = req.user;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      await this.redisProducer.addToQueue('cancelPlaceBetQueue', {
        ...body,
        uid: user._id,
      });
      return { message: 'Lệnh hủy của bạn đang được xử lý' };
    } finally {
      release();
    }
  }
}
