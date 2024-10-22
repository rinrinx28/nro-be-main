import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './strategy/local.strategy';
import { JwtStrategy } from './strategy/jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { FingerPrint, FingerPrintSchema } from './schema/finger.schema';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: 'IF YOU WANNA FIND THEM, IT NOT THING!', // Replace with your secret key
      signOptions: { expiresIn: '7d' }, // Token expiration
    }),
    MongooseModule.forFeature([
      {
        name: FingerPrint.name,
        schema: FingerPrintSchema,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
