import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { MessageRe } from './dto/dto.socket';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SocketClientService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly eventEmit: EventEmitter2) {}

  private socket: Socket;

  onModuleInit() {
    this.connectToServer();
  }

  connectToServer() {
    // Replace with the correct URL of your server
    this.socket = io(process.env.URI_SOCKET2);

    // Manually connect to the server
    this.socket.connect();

    // Listen for connection event
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    // Listen for messages from the server
    this.socket.on('message-re', (data: MessageRe) => {
      this.eventEmit.emitAsync('message.re', data);
    });

    // Listen for messages from the server
    this.socket.on('bot.status', (data: any) => {
      this.eventEmit.emitAsync('bot.status', data);
    });

    // Listen for messages from the server
    this.socket.on('mini.bet', (data: any) => {
      this.eventEmit.emitAsync('mini.bet', data);
    });
    // Listen for messages from the server
    this.socket.on('user.update', (data: any) => {
      this.eventEmit.emitAsync('user.update', data);
    });
    // Listen for messages from the server
    this.socket.on('service.update', (data: any) => {
      this.eventEmit.emitAsync('service.update', data);
    });

    this.socket.on('service.cancel', (data: any) => {
      console.log(data);
      this.eventEmit.emitAsync('service.cancel.client', data);
    });
    // Listen for messages from the server
    this.socket.on('clan.update.bulk', (data: any) => {
      this.eventEmit.emitAsync('clan.update.bulk', data);
    });
    // Listen for messages from the server
    this.socket.on('jackpot.update', (data: any) => {
      this.eventEmit.emitAsync('jackpot.update', data);
    });

    // Handle disconnection
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  sendMessageToServer(room: string, message: string) {
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
