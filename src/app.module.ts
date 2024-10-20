import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { ServiceModule } from './service/service.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MiniGameModule } from './mini-game/mini-game.module';
import { MessageModule } from './message/message.module';
import { ClanModule } from './clan/clan.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SocketClientModule } from './socket/socket.module';
import { EventModule } from './event/event.module';
import { NoCallModule } from './no-call/no-call.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.URI_DATABASE),
    EventEmitterModule.forRoot(),
    BotModule,
    ServiceModule,
    UserModule,
    AuthModule,
    MiniGameModule,
    MessageModule,
    ClanModule,
    SocketClientModule,
    EventModule,
    NoCallModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
