import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtWsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token || client.handshake?.headers?.authorization;
    if (!token) {
      throw new WsException('Thiếu mã đăng nhập, xin vui lòng đăng nhập lại');
    }

    try {
      const decoded = jwt.verify(
        token,
        'IF YOU WANNA FIND THEM, IT NOT THING!',
      ); // Replace with your secret
      context.switchToWs().getData().uid = decoded.sub; // Attach user info to the data
      return true;
    } catch (err) {
      throw new WsException('Người dùng không hợp lệ');
    }
  }
}
