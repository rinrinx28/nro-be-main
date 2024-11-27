import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelService, CreateService } from 'src/service/dto/dto.service';
import { JwtWsGuard } from './jw-ws.guard';
import { WebSocketExceptionFilter } from './websocket-exception.filter';
import { Cancel, Place } from 'src/mini-game/dto/dto.mini';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3035',
      'http://localhost:3036',
      'https://beta.nrogame.me',
      'http://154.26.133.248:3000',
    ],
  },
})
@UseFilters(new WebSocketExceptionFilter()) // Apply globally
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private eventEmit: EventEmitter2) {}
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('SocketGateway');

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('user.chat')
  handleMessage(@MessageBody() data: any) {
    this.eventEmit.emitAsync('user.chat', data);
  }

  @SubscribeMessage('user.chat.clan')
  handleMessageClan(@MessageBody() data: any) {
    this.eventEmit.emitAsync('user.chat.clan', data);
  }

  @SubscribeMessage('info.mini')
  handleInfoMini(@MessageBody() data: any) {
    this.eventEmit.emitAsync('info.mini', data);
  }

  @SubscribeMessage('jackpot.get')
  handleJackpot(@MessageBody() data: any) {
    this.eventEmit.emitAsync('jackpot.get', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.create')
  handlerCreate(@MessageBody() data: CreateService) {
    this.eventEmit.emitAsync('service.create', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.cancel')
  handlerUpdate(@MessageBody() data: CancelService) {
    this.eventEmit.emitAsync('service.cancel', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.tranfer.money')
  tranferMoney(
    @MessageBody()
    data: {
      targetId: string;
      amount: number;
      server: string;
      ownerId?: string;
      uid: string;
    },
  ) {
    data.ownerId = data.uid;
    this.eventEmit.emitAsync('service.tranfer.money', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.exchange.diamon')
  exchangeDiamon(
    @MessageBody() data: { diamon: number; ownerId?: string; uid: string },
  ) {
    data.ownerId = data.uid;
    this.eventEmit.emitAsync('service.exchange.diamon', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('minigame.place')
  place(@MessageBody() data: Place) {
    this.eventEmit.emitAsync('minigame.place', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('minigame.cancel')
  cancelPlace(@MessageBody() data: Cancel) {
    this.eventEmit.emitAsync('minigame.cancel', data);
  }
}
