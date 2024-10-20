import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { SocketClientModule } from 'src/socket/socket.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { MessageModule } from 'src/message/message.module';
import { ClanModule } from 'src/clan/clan.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Clan, ClanSchema } from 'src/clan/schema/clan.schema';
import { ClanMessage, ClanMessageSchema } from 'src/clan/schema/msgClan.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { Message, MessageSchema } from 'src/message/schema/message.schema';
import {
  UserActive,
  UserActiveSchema,
} from 'src/user/schema/userActive.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Clan.name,
        schema: ClanSchema,
      },
      {
        name: ClanMessage.name,
        schema: ClanMessageSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: UserActive.name,
        schema: UserActiveSchema,
      },
      {
        name: Message.name,
        schema: MessageSchema,
      },
    ]),
    SocketClientModule,
    AuthModule,
    UserModule,
    MessageModule,
    ClanModule,
  ],
  providers: [EventService],
})
export class EventModule {}
