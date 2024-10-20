import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { UserActive, UserActiveSchema } from './schema/userActive.schema';
import { EConfig, EConfigSchema } from './schema/config.schema';
import { UserBet, UserBetSchema } from './schema/userBet.schema';
import { SocketClientModule } from 'src/socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: UserActive.name,
        schema: UserActiveSchema,
      },
      {
        name: EConfig.name,
        schema: EConfigSchema,
      },
      {
        name: UserBet.name,
        schema: UserBetSchema,
      },
    ]),
    SocketClientModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
