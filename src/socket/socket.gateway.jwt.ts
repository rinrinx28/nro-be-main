import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelService, CreateService } from 'src/service/dto/dto.service';
import { JwtWsGuard } from './jw-ws.guard';
import { WebSocketExceptionFilter } from './websocket-exception.filter';
import { Cancel, Place } from 'src/mini-game/dto/dto.mini';

@WebSocketGateway({
  namespace: 'auth',
  cors: {
    origin: [
      // 'http://localhost:3000',
      // 'http://localhost:3035',
      // 'http://localhost:3036',
      'https://beta.nrogame.me',
      'http://154.26.133.248:3000',
    ],
  },
})
@UseFilters(new WebSocketExceptionFilter()) // Apply globally
export class SocketGatewayAuth
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private eventEmit: EventEmitter2) {}
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('SocketGateway Auth');

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.create')
  handlerCreate(
    @MessageBody() data: CreateService,
    @ConnectedSocket() client: Socket,
  ) {
    data.clientId = client.id;
    this.eventEmit.emitAsync('service.create', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.cancel')
  handlerUpdate(
    @MessageBody() data: CancelService,
    @ConnectedSocket() client: Socket,
  ) {
    data.clientId = client.id;
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
      clientId?: string;
    },
    @ConnectedSocket() client: Socket, // Access the connected WebSocket client
  ) {
    data.ownerId = data.uid;
    data.clientId = client.id;
    this.eventEmit.emitAsync('service.tranfer.money', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('service.exchange.diamon')
  exchangeDiamon(
    @MessageBody()
    data: { diamon: number; ownerId?: string; uid: string; clientId?: string },
    @ConnectedSocket() client: Socket, // Access the connected WebSocket client
  ) {
    data.ownerId = data.uid;
    data.clientId = client.id;
    this.eventEmit.emitAsync('service.exchange.diamon', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('minigame.place')
  place(@MessageBody() data: Place, @ConnectedSocket() client: Socket) {
    data.clientId = client.id;
    this.eventEmit.emitAsync('minigame.place', data);
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('minigame.cancel')
  cancelPlace(@MessageBody() data: Cancel, @ConnectedSocket() client: Socket) {
    data.clientId = client.id;
    this.eventEmit.emitAsync('minigame.cancel', data);
  }
}
