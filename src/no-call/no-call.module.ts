import { Module } from '@nestjs/common';
import { NoCallService } from './no-call.service';
import { NoCallController } from './no-call.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniGame, MiniGameSchema } from 'src/mini-game/schema/mini.schema';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { EConfig, EConfigSchema } from 'src/user/schema/config.schema';
import { UserBet, UserBetSchema } from 'src/user/schema/userBet.schema';
import { Service, ServiceSchema } from 'src/service/schema/service.schema';
import { Message, MessageSchema } from 'src/message/schema/message.schema';
import { Clan, ClanSchema } from 'src/clan/schema/clan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MiniGame.name,
        schema: MiniGameSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: EConfig.name,
        schema: EConfigSchema,
      },
      {
        name: UserBet.name,
        schema: UserBetSchema,
      },
      {
        name: Message.name,
        schema: MessageSchema,
      },
      {
        name: Clan.name,
        schema: ClanSchema,
      },
    ]),
  ],
  controllers: [NoCallController],
  providers: [NoCallService],
})
export class NoCallModule {}
