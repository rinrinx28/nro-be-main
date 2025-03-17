import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Service, ServiceSchema } from './schema/service.schema';
import { UserModule } from 'src/user/user.module';
import { SocketClientModule } from 'src/socket/socket.module';
import { Spam, SpamSchema } from './schema/spam.schema';
import { Cron, CronSchema } from './schema/cron.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: Spam.name, schema: SpamSchema },
      { name: Cron.name, schema: CronSchema },
    ]),
    UserModule,
    SocketClientModule,
    HttpModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}
