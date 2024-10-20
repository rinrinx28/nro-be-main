import { Module } from '@nestjs/common';
import { ClanService } from './clan.service';
import { ClanController } from './clan.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Clan, ClanSchema } from './schema/clan.schema';
import { ClanMessage, ClanMessageSchema } from './schema/msgClan.schema';
import { UserModule } from 'src/user/user.module';
import { InviteClan, InviteClanSchema } from './schema/invite.schema';
import { SocketClientModule } from 'src/socket/socket.module';

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
        name: InviteClan.name,
        schema: InviteClanSchema,
      },
    ]),
    UserModule,
    SocketClientModule,
  ],
  controllers: [ClanController],
  providers: [ClanService],
  exports: [ClanService],
})
export class ClanModule {}
