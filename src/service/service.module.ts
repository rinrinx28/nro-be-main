import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Service, ServiceSchema } from './schema/service.schema';
import { UserModule } from 'src/user/user.module';
import { SocketClientModule } from 'src/socket/socket.module';
import { Spam, SpamSchema } from './schema/spam.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: Spam.name, schema: SpamSchema },
    ]),
    UserModule,
    SocketClientModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}
