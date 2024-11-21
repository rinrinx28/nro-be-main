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
import { TaskServiceService } from './task-service/task-service.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule2 } from './admin/admin.module';
import { RedisModule } from './redis/redis.module';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.URI_DATABASE),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
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
    AdminModule2,
    RedisModule,
    QueuesModule,
  ],
  controllers: [AppController],
  providers: [AppService, TaskServiceService],
})
export class AppModule {}
