import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketExceptionFilter } from './websocket-exception.filter';

@WebSocketGateway({
  cors: {
    origin: [
      // 'http://localhost:3000',
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
}
