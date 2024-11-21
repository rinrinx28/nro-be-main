import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import {
  CancelServiceController,
  CreateServiceController,
} from './dto/dto.service';
import { Mutex } from 'async-mutex';

@Controller('service')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  private readonly mutexMap: Map<string, Mutex> = new Map();

  constructor(
    private readonly serviceService: ServiceService,
    private readonly userService: UserService,
  ) {}

  private async getMutex(key: string): Promise<Mutex> {
    if (!this.mutexMap.has(key)) {
      this.mutexMap.set(key, new Mutex());
    }
    return this.mutexMap.get(key);
  }

  @Post('/create')
  async handlerCreate(@Body() body: CreateServiceController, @Req() req: any) {
    const user = req.user;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      return await this.serviceService.handlerCreate({
        ...body,
        amount: Number(body.amount),
        uid: user._id.toString(),
      });
    } finally {
      release();
    }
  }

  @Post('/cancel')
  async handlerCancel(@Body() body: CancelServiceController, @Req() req: any) {
    const user = req.user;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      return await this.serviceService.handlerUpdate({
        ...body,
        uid: user._id.toString(),
      });
    } finally {
      release();
    }
  }

  @Post('/tranfer')
  async tranferMoney(
    @Body() body: { targetId: string; amount: number; server: string },
    @Req() req: any,
  ) {
    const user = req.user;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      return await this.serviceService.tranferMoney({
        ...body,
        ownerId: user._id.toString(),
      });
    } finally {
      release();
    }
  }

  @Post('/exchange')
  async exchangeDiamon(@Body() body: { diamon: number }, @Req() req: any) {
    const user = req.user;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      return await this.serviceService.exchangeDiamon({
        ...body,
        ownerId: user._id.toString(),
      });
    } finally {
      release();
    }
  }

  @Get('/history')
  async history(@Req() req: any) {
    const user = req.user;
    const { page = 0, limited = 25 } = req.query;
    const mutex = await this.getMutex(user._id.toString());
    const release = await mutex.acquire();
    try {
      return await this.serviceService.history({
        page: Number(page),
        limited: Number(limited),
        ownerId: user._id.toString(),
      });
    } finally {
      release();
    }
  }
}
