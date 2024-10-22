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
import { InjectModel } from '@nestjs/mongoose';
import { Clan } from 'src/clan/schema/clan.schema';
import { Model } from 'mongoose';
import { User } from 'src/user/schema/user.schema';
import { Message } from 'src/message/schema/message.schema';
import { ClanMessage } from 'src/clan/schema/msgClan.schema';
import * as moment from 'moment';
import { UserActive } from 'src/user/schema/userActive.schema';
import { MiniGame } from 'src/mini-game/schema/mini.schema';

@Injectable()
export class EventService {
  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly socketClient: SocketClientService,
    private jwtService: JwtService,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
    private readonly clanService: ClanService,
    @InjectModel(Clan.name)
    private readonly clanModel: Model<Clan>,
    @InjectModel(User.name)
    private readonly UserModel: Model<User>,
    @InjectModel(UserActive.name)
    private readonly UserActiveModel: Model<UserActive>,
    @InjectModel(Message.name)
    private readonly MessageModel: Model<Message>,
    @InjectModel(ClanMessage.name)
    private readonly ClanMessageModel: Model<ClanMessage>,
    @InjectModel(MiniGame.name)
    private readonly MiniGameModel: Model<MiniGame>,
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

  @OnEvent('clan.update.bulk', { async: true })
  async handleClanBulkUpdate(payload: any) {
    this.socketGateway.server.emit('clan.update.bulk', payload);
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

  //TODO ———————————————[Task Auto]———————————————
  @OnEvent('turn.of.mini.game', { async: true })
  async handlerTurnOfMiniGame(status: string) {
    try {
      const e_bet = await this.userService.findConfigWithName('e_bet');
      if (!e_bet) throw new Error('Không tìm thấy E Bet Config');

      let new_enable = e_bet.option.enable.map((e: boolean) => false);
      e_bet.option.enable = new_enable;

      // Mark the array as modified
      e_bet.markModified('option.enable');

      await e_bet.save();
      this.logger.log('Auto Off Mini Game Client: Success');

      this.MessageModel.create({
        uid: 'local',
        content:
          'Bảo trì tự động toàn bộ Máy chủ Game, chúc mọi người một ngày tốt lành!',
        server: 'all',
      });
    } catch (err: any) {
      this.logger.log('Err Auto Off Mini Game Client: ' + err.message);
    }
  }

  @OnEvent('turn.on.mini.game', { async: true })
  async handlerTurnOnMiniGame(status: string) {
    try {
      const e_bet = await this.userService.findConfigWithName('e_bet');
      if (!e_bet) throw new Error('Không tìm thấy E Bet Config');

      let new_enable = e_bet.option.enable.map((e: boolean) => true);
      e_bet.option.enable = new_enable;

      // Mark the array as modified
      e_bet.markModified('option.enable');

      await e_bet.save();
      this.logger.log('Auto On Mini Game Client: Success');
      this.MessageModel.create({
        uid: 'local',
        content:
          'Hoàn tất bảo trì tự động toàn bộ Máy chủ Game, chúc mọi người một ngày tốt lành!',
        server: 'all',
      });
    } catch (err: any) {
      this.logger.log('Err Auto On Mini Game Client: ' + err.message);
    }
  }

  @OnEvent('turn.of.mini.game.24', { async: true })
  async handlerTurnOfMinigame24(status: string) {
    try {
      const e_bet = await this.userService.findConfigWithName('e_bet');
      if (!e_bet) throw new Error('Không tìm thấy cài đặt');
      e_bet.option.enable24 = false;
      e_bet.markModified('option.enable24');
      await e_bet.save();
      this.logger.log('Auto Turn Off Minigame 24');
      this.MessageModel.create({
        uid: 'local',
        content:
          'Bảo trì tự động Máy Chủ 24 trong 2p, chúc mọi người một ngày tốt lành!',
        server: 'all',
      });
    } catch (err: any) {
      this.logger.log('Err Auto Turn Off Minigame 24: ' + err.message);
    }
  }

  @OnEvent('turn.on.mini.game.24', { async: true })
  async handlerTurnOnMinigame24(status: string) {
    try {
      const e_bet = await this.userService.findConfigWithName('e_bet');
      if (!e_bet) throw new Error('Không tìm thấy cài đặt');
      e_bet.option.enable24 = true;
      e_bet.markModified('option.enable24');
      await e_bet.save();
      this.logger.log('Auto Turn On Minigame 24');
      this.MessageModel.create({
        uid: 'local',
        content:
          'Bảo trì tự động hoàn tất Máy Chủ 24, chúc mọi người một ngày thật nhiều may mắn!',
        server: 'all',
      });
    } catch (err: any) {
      this.logger.log('Err Auto Turn On Minigame 24: ' + err.message);
    }
  }

  @OnEvent('top.clan', { async: true })
  async handlerTopClan() {
    try {
      const e_clan = await this.userService.findConfigWithName('e_clan');
      if (!e_clan) throw new Error('Không tìm thấy e_clan');
      const { prizes, require_m, require_join } = e_clan.option;
      const clans = await this.clanModel
        .find({})
        .sort({ score: -1 })
        .limit(prizes.length ?? 4);
      const list_top_clanId = clans.map((c) => c.id);

      // find user of clanId
      const members_clans = await this.UserModel.find({
        'meta.clanId': {
          $in: list_top_clanId,
        },
      });

      // Filter all user have score > require_m and join after require_join
      const members_clans_filter = members_clans.filter(
        (m) =>
          m.meta.score >= require_m &&
          moment().unix() - moment(m.meta.timeJoin).unix() > require_join,
      );

      // Let send prizes and save useActives;
      let userActives: { uid: string; active: Record<string, any> }[] = [];
      let messages: { uid: 'local'; content: string; server: 'all' }[] = [];

      for (let i = 0; i < clans.length; i++) {
        let clan = clans[i];
        if (clan.score <= 0) break;
        let prize = prizes[0];
        let clanId = clan.id;
        let list_m: string[] = [];
        for (const m of members_clans_filter) {
          // Save userActives;
          userActives.push({
            uid: m.id,
            active: {
              name: 'top_clan',
              top: i + 1,
              m_current: m.money,
              m_new: m.money + prize,
            },
          });

          // Save prizes
          list_m.push(m.id);
          messages.push({
            content: `Chúc mừng người chơi ${m.name} đã nhận được giải thưởng ${new Intl.NumberFormat('vi').format(prize)} vàng với Clan TOP ${i + 1}: ${clan.meta.name}`,
            server: 'all',
            uid: 'local',
          });
        }
        await this.UserModel.updateMany(
          {
            'meta.clanId': clanId, // Filter by clanId inside the 'meta' field
            _id: { $in: list_m }, // Use $in operator to match _id from the list
          },
          {
            $inc: {
              money: prize, // Increment the money field by prize
            },
            $set: {
              'meta.score': 0,
            },
          },
        );

        // Reset Score Clan
        clan.score = 0;
        clan.markModified('meta');
        await clan.save();
      }

      // Send prize and reset score clan;
      await this.UserActiveModel.insertMany(userActives);

      // send notice;
      await this.MessageModel.insertMany(messages);

      // Send Client reload User and Clan;
      this.socketGateway.server.emit('user.reload', 'ok');
      this.socketGateway.server.emit('clan.reload', 'ok');
    } catch (err: any) {
      this.logger.log('Err Top Clan Auto: ' + err.message);
    }
  }

  @OnEvent('top.user', { async: true })
  async handleTopUser() {
    try {
      const e_user_rank =
        await this.userService.findConfigWithName('e_user_rank');
      if (!e_user_rank) throw new Error('Không tìm thấy e_user_rank');
      const { winer = 7, prizes, require_s } = e_user_rank.option;
      const list_users_top = await this.UserModel.find()
        .sort({ 'meta.totalTrade': -1 })
        .limit(winer);

      const list_users_filter = list_users_top.filter(
        (u) => u.meta.totalTrade > require_s,
      );

      // let send prizes for user and send notice;
      let messages: { uid: 'local'; content: string; server: 'all' }[] = [];
      list_users_filter.forEach(async (u, i) => {
        let prize = prizes[i];
        messages.push({
          uid: 'local',
          content: `Chúc mừng người chơi ${u.name} đã nhận được ${new Intl.NumberFormat('vi').format(prize)} vàng từ giải thưởng TOP ${i + 1} Ngày`,
          server: 'all',
        });
        await this.UserActiveModel.create({
          uid: u.id,
          active: {
            name: 'top_day',
            top: i + 1,
            prize: prize,
            m_current: u.money,
            m_new: u.money + prize,
          },
        });

        u.money += prize;
        await u.save();
      });

      // Send Notice;
      await this.MessageModel.insertMany(messages);

      // Reset All Score User;
      await this.UserModel.updateMany(
        {},
        {
          $set: {
            'meta.totalTrade': 0,
            'meta.limitTrade': 0,
            'meta.trade': 0,
          },
        },
      );

      // Send Event to clien for Reload User;
      this.socketGateway.server.emit('user.reload', 'ok');
      this.logger.log('Auto TOP User');
    } catch (err: any) {
      this.logger.log('Err Top User: ' + err.message);
    }
  }

  @OnEvent('reset.message', { async: true })
  async handlerREMsg() {
    try {
      await this.MessageModel.deleteMany({});
      await this.ClanMessageModel.deleteMany({});
      this.logger.log('Auto Reset Message is success!');
    } catch (err: any) {
      this.logger.log('Err Auto Reset Message: ' + err.message);
    }
  }

  @OnEvent('reset.mini.game', { async: true })
  async handleResetMinigame() {
    try {
      await this.MiniGameModel.updateMany(
        {
          server: {
            $in: ['1', '2', '3', '4', '5', '6', '7', '8', '11', '12', '13'],
          },
        },
        {
          $set: {
            isEnd: true,
          },
        },
      );
      this.logger.log('Auto Reset Mini game is Success!');
    } catch (err: any) {
      this.logger.log('Err auto reset mini game: ' + err.message);
    }
  }
}
