import { Module } from '@nestjs/common';
import { MiniGameService } from './mini-game.service';
import { MiniGameController } from './mini-game.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniGame, MiniGameSchema } from './schema/mini.schema';
import { ResultMiniGame, ResultMiniGameSchema } from './schema/result.schema';
import { UserModule } from 'src/user/user.module';
import { SocketClientModule } from 'src/socket/socket.module';
import { MessageModule } from 'src/message/message.module';
import { Jackpot, JackpotSchema } from './schema/jackpot';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MiniGame.name,
        schema: MiniGameSchema,
      },
      { name: Jackpot.name, schema: JackpotSchema },
    ]),
    UserModule,
    SocketClientModule,
    MessageModule,
  ],

  controllers: [MiniGameController],
  providers: [MiniGameService],
})
export class MiniGameModule {}
