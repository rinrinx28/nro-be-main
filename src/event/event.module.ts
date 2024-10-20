import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { SocketClientModule } from 'src/socket/socket.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { MessageModule } from 'src/message/message.module';
import { ClanModule } from 'src/clan/clan.module';

@Module({
  imports: [
    SocketClientModule,
    AuthModule,
    UserModule,
    MessageModule,
    ClanModule,
  ],
  providers: [EventService],
})
export class EventModule {}
