import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Bot } from 'src/bot/schema/bot.schema';
import { SocketGateway } from 'src/socket/socket.gateway';
import { UserChat, UserChatClan } from './dto/dto.event';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { MessageService } from 'src/message/message.service';
import { ClanService } from 'src/clan/clan.service';
import { SocketClientService } from 'src/socket/socket.service';

@Injectable()
export class EventService {
  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly socketClient: SocketClientService,
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
    private readonly clanService: ClanService,
  ) {}
  private logger: Logger = new Logger('Middle Handler');

  @OnEvent('bot.status', { async: true })
  async handleBotStatus(payload: Bot) {
    this.socketGateway.server.emit('bot.status', payload);
  }

  @OnEvent('message.re', { async: true })
  async handleMessageRE(payload: any) {
    this.socketGateway.server.emit('message.re', payload);
  }

  @OnEvent('mini.bet', { async: true })
  async handleMiniBet(payload: any) {
    this.socketGateway.server.emit('mini.bet', payload);
  }

  @OnEvent('info.mini', { async: true })
  async handleInfoMini(payload: any) {
    this.socketClient.sendMessageToServer('mini.bet.info', payload);
  }

  @OnEvent('user.update', { async: true })
  async handleUserUpdate(payload: any) {
    this.socketGateway.server.emit('user.update', payload);
  }

  @OnEvent('service.update', { async: true })
  async handleServiceUpdate(payload: any) {
    this.socketGateway.server.emit('service.update', payload);
  }

  @OnEvent('user.chat', { async: true })
  async handleUserChat(payload: UserChat) {
    const { uid, token, content, server } = payload;
    try {
      const { sub } = await this.jwtService.verifyAsync(token, {
        secret: 'IF YOU WANNA FIND THEM, IT NOT THING!',
      });
      if (sub !== uid) throw new Error('Token không khớp');

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại');

      const msg = await this.messageService.createMSG({
        content: content,
        server: server,
        uid: uid,
        meta: { ...(user.meta ?? {}), name: user.name },
      });

      this.socketGateway.server.emit('user.chat', { msg, status: true });
    } catch (err: any) {
      this.logger.log(`Err Chat: UID:${uid}`);
      this.socketGateway.server.emit('user.chat', {
        status: false,
        token: token,
      });
    }
  }

  @OnEvent('user.chat.clan', { async: true })
  async handleUserChatClan(payload: UserChatClan) {
    const { uid, token, content } = payload;
    try {
      const { sub } = await this.jwtService.verifyAsync(token, {
        secret: 'IF YOU WANNA FIND THEM, IT NOT THING!',
      });
      if (sub !== uid) throw new Error('Token không khớp');

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại');

      let { clanId = null } = user.meta;
      if (!clanId || payload.clanId !== clanId)
        throw new Error('Bạn không ở trong một bang hội');

      const msg = await this.clanService.createClanMSG({
        content: content,
        clanId: clanId,
        uid: uid,
        meta: { ...(user.meta ?? {}), name: user.name },
      });

      this.socketGateway.server.emit('user.chat.clan', { msg, status: true });
    } catch (err: any) {
      this.logger.log(`Err Chat Clan: UID:${uid}`);
      this.socketGateway.server.emit('user.chat.clan', {
        status: false,
        token: token,
      });
    }
  }
}
