import { Module } from '@nestjs/common';
import { SocketClientService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { SocketGatewayAuth } from './socket.gateway.jwt';

@Module({
  providers: [SocketClientService, SocketGateway, SocketGatewayAuth],
  exports: [SocketClientService, SocketGateway, SocketGatewayAuth], // Make it available to other modules
})
export class SocketClientModule {}
