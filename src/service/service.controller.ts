import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  CancelServiceController,
  CreateServiceController,
} from './dto/dto.service';
@Controller('service')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post('/create')
  async handlerCreate(@Body() body: CreateServiceController, @Req() req: any) {
    // const user = req.user;
    // return await this.serviceService.handlerCreate({
    //   ...body,
    //   amount: Number(body.amount),
    //   uid: user._id.toString(),
    // });
    throw new HttpException(
      { message: 'Cổng nạp/rút tạm đóng', code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Post('/cancel')
  async handlerCancel(@Body() body: CancelServiceController, @Req() req: any) {
    // const user = req.user;
    // return await this.serviceService.handlerUpdate({
    //   ...body,
    //   uid: user._id.toString(),
    // });
    throw new HttpException(
      { message: 'Cổng nạp/rút tạm đóng', code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Post('/tranfer')
  async tranferMoney(
    @Body() body: { targetId: string; amount: number; server: string },
    @Req() req: any,
  ) {
    // const user = req.user;
    // return await this.serviceService.tranferMoney({
    //   ...body,
    //   ownerId: user._id.toString(),
    // });
    throw new HttpException(
      { message: 'Cổng giao dịch tạm đóng', code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Post('/exchange')
  async exchangeDiamon(@Body() body: { diamon: number }, @Req() req: any) {
    // const user = req.user;
    // return await this.serviceService.exchangeDiamon({
    //   ...body,
    //   ownerId: user._id.toString(),
    // });
    throw new HttpException(
      { message: 'Cổng đổi vàng tạm đóng', code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Get('/history')
  async history(@Req() req: any) {
    const user = req.user;
    const { page = 0, limited = 25 } = req.query;
    return await this.serviceService.history({
      page: Number(page),
      limited: Number(limited),
      ownerId: user._id.toString(),
    });
  }
}
