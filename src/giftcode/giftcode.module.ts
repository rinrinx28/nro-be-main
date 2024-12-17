import { Module } from '@nestjs/common';
import { GiftcodeService } from './giftcode.service';
import { GiftcodeController } from './giftcode.controller';
import { GiftCode, GiftCodeSchema } from './schema/giftcode.schema';
import { SocketClientModule } from 'src/socket/socket.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: GiftCode.name,
        schema: GiftCodeSchema,
      },
    ]),
    SocketClientModule,
  ],
  controllers: [GiftcodeController],
  providers: [GiftcodeService],
})
export class GiftcodeModule {}
