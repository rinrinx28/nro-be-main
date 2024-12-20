import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { MessageRe } from './dto/dto.socket';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Service } from 'src/service/schema/service.schema';
import { User } from 'src/user/schema/user.schema';

@Injectable()
export class SocketCronService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly eventEmit: EventEmitter2) {}

  private socket: Socket;

  onModuleInit() {
    this.connectToServer();
  }

  connectToServer() {
    // Replace with the correct URL of your server
    this.socket = io(process.env.URI_SOCKET_CRON);

    // Manually connect to the server
    this.socket.connect();

    // Listen for connection event
    this.socket.on('connect', () => {
      console.log('Connected to Socket Cron server');
    });

    this.socket.on('service.update', (data: Service) => {
      this.eventEmit.emit('service.update.event', data);
    });

    this.socket.on('user.update', (data: User) => {
      this.eventEmit.emit('user.update.event', data);
    });

    this.socket.on(
      'notification.user',
      (data: { uid: string; message: string }) => {
        this.eventEmit.emit('notification.user.event', data);
      },
    );

    // Handle disconnection
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  sendMessageToServer(room: string, message: any) {
    if (!this.socket.connected) {
      this.socket.connect();
    }
    this.socket.emit(room, message);
  }

  onModuleDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
