import { Module } from '@nestjs/common';
import { SocketClientService } from './socket.service';
import { SocketGateway } from './socket.gateway';

@Module({
  providers: [SocketClientService, SocketGateway],
  exports: [SocketClientService, SocketGateway], // Make it available to other modules
})
export class SocketClientModule {}
