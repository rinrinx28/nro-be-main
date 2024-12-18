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
import { MiniGame, MiniGameSchema } from 'src/mini-game/schema/mini.schema';
import { Jackpot, JackpotSchema } from 'src/mini-game/schema/jackpot';
import { FingerPrint, FingerPrintSchema } from 'src/auth/schema/finger.schema';

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
      {
        name: MiniGame.name,
        schema: MiniGameSchema,
      },
      { name: Jackpot.name, schema: JackpotSchema },
      {
        name: FingerPrint.name,
        schema: FingerPrintSchema,
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
