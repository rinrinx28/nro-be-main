import { Module } from '@nestjs/common';
import { SocketClientService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { SocketGatewayAuth } from './socket.gateway.jwt';
import { SocketCronService } from './socket.cron.service';

@Module({
  providers: [
    SocketClientService,
    SocketCronService,
    SocketGateway,
    SocketGatewayAuth,
  ],
  exports: [
    SocketClientService,
    SocketCronService,
    SocketGateway,
    SocketGatewayAuth,
  ], // Make it available to other modules
})
export class SocketClientModule {}
