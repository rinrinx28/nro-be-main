import { Module } from '@nestjs/common';
import { MiniGameService } from './mini-game.service';
import { MiniGameController } from './mini-game.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MiniGame, MiniGameSchema } from './schema/mini.schema';
import { ResultMiniGame, ResultMiniGameSchema } from './schema/result.schema';
import { UserModule } from 'src/user/user.module';
import { SocketClientModule } from 'src/socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MiniGame.name,
        schema: MiniGameSchema,
      },
    ]),
    UserModule,
    SocketClientModule,
  ],

  controllers: [MiniGameController],
  providers: [MiniGameService],
})
export class MiniGameModule {}
