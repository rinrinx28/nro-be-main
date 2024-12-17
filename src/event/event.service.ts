import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
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
import moment from 'moment';
import { UserActive } from 'src/user/schema/userActive.schema';
import { MiniGame } from 'src/mini-game/schema/mini.schema';
import { Jackpot } from 'src/mini-game/schema/jackpot';
import { FingerPrint } from 'src/auth/schema/finger.schema';
import { Mutex } from 'async-mutex';

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
    @InjectModel(Jackpot.name)
    private readonly JackpotModel: Model<Jackpot>,
    @InjectModel(FingerPrint.name)
    private readonly FingerPrintModel: Model<FingerPrint>,
    private readonly eventEmit: EventEmitter2,
  ) {}
  private logger: Logger = new Logger('Middle Handler');
  private readonly mutexMap = new Map<string, Mutex>();

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
    this.eventEmit.emitAsync('remove.autocancel', payload.id);
  }

  @OnEvent('clan.update.bulk', { async: true })
  async handleClanBulkUpdate(payload: any) {
    this.socketGateway.server.emit('clan.update.bulk', payload);
  }

  @OnEvent('user.chat', { async: true })
  async handleUserChat(payload: UserChat) {
    const { uid, token, content, server } = payload;
    const parameter = `${uid}.handleUserChat`; // Value will be lock

    // Create mutex if it not exist
    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();
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
    } finally {
      release();
    }
  }

  @OnEvent('user.chat.clan', { async: true })
  async handleUserChatClan(payload: UserChatClan) {
    const { uid, token, content } = payload;
    const parameter = `${uid}.handleUserChatClan`; // Value will be lock

    // Create mutex if it not exist
    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();
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
    } finally {
      release();
    }
  }

  @OnEvent('jackpot.update', { async: true })
  async updateJackpot(payload: any) {
    this.socketGateway.server.emit('jackpot.update', payload);
  }

  @OnEvent('jackpot.get', { async: true })
  async getJackpot(payload: any) {
    const jackpot = await this.JackpotModel.findOne({ server: '24' });
    this.socketGateway.server.emit('jackpot.update', jackpot.toObject());
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

      const msg = await this.MessageModel.create({
        uid: 'local',
        content:
          'Bảo trì toàn bộ Máy chủ Game, chúc mọi người một ngày tốt lành!',
        server: 'all',
      });
      this.socketGateway.server.emit('message.re', msg);
      this.logger.log('Auto Off Mini Game Client: Success');
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
      const msg = await this.MessageModel.create({
        uid: 'local',
        content:
          'Hoàn tất bảo trì tự động toàn bộ Máy chủ Game, chúc mọi người một ngày tốt lành!',
        server: 'all',
      });
      this.socketGateway.server.emit('message.re', msg);
      this.logger.log('Auto On Mini Game Client: Success');
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
      const msg = await this.MessageModel.create({
        uid: 'local',
        content:
          'Bảo trì tự động Máy Chủ 24 trong 2p, chúc mọi người một ngày tốt lành!',
        server: 'all',
      });
      this.socketGateway.server.emit('message.re', msg);
      this.logger.log('Auto Turn Off Minigame 24');
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
      const msg = await this.MessageModel.create({
        uid: 'local',
        content:
          'Bảo trì tự động hoàn tất Máy Chủ 24, chúc mọi người một ngày thật nhiều may mắn!',
        server: 'all',
      });
      this.socketGateway.server.emit('message.re', msg);
      this.logger.log('Auto Turn On Minigame 24');
    } catch (err: any) {
      this.logger.log('Err Auto Turn On Minigame 24: ' + err.message);
    }
  }

  @OnEvent('top.clan', { async: true })
  async handlerTopClan() {
    try {
      // Step 1: Retrieve configuration
      const e_clan = await this.userService.findConfigWithName('e_clan');
      if (!e_clan) throw new Error('Không tìm thấy e_clan');
      const { prizes, require_m, require_join } = e_clan.option;

      // Step 2: Get top clans
      const clans = await this.clanModel
        .find({})
        .sort({ score: -1 })
        .limit(prizes.length || 4);
      const topClanIds = clans.map((c) => c.id);

      // Step 3: Get eligible members
      const members = await this.UserModel.find({
        'meta.clanId': { $in: topClanIds },
      });

      const now = moment().unix();
      const eligibleMembers = members.filter((m) => {
        const { score, timeJoin } = m.meta;
        return (
          score >= require_m && now - moment(timeJoin).unix() > require_join
        );
      });

      // Step 4: Prepare updates and notifications
      const userActives: { uid: string; active: Record<string, any> }[] = [];
      const messages: { uid: 'local'; content: string; server: 'all' }[] = [];
      const userUpdates = [];

      for (let i = 0; i < clans.length; i++) {
        const clan = clans[i];
        if (clan.score <= 0) break;
        const prize = prizes[i] || 0;

        const clanMembers = eligibleMembers.filter(
          (m) => m.meta.clanId === clan.id,
        );

        clanMembers.forEach((member) => {
          // Record user activity
          userActives.push({
            uid: member.id,
            active: {
              name: 'top_clan',
              top: i + 1,
              m_current: member.money,
              m_new: member.money + prize,
              prize,
            },
          });

          // Create notification
          messages.push({
            content: `Chúc mừng người chơi ${member.name} đã nhận được giải thưởng ${new Intl.NumberFormat(
              'vi',
            ).format(prize)} vàng với Clan TOP ${i + 1}: ${clan.meta.name}`,
            server: 'all',
            uid: 'local',
          });

          // Update user money and score
          userUpdates.push({
            updateOne: {
              filter: { _id: member.id },
              update: { $inc: { money: +prize }, $set: { 'meta.score': 0 } },
            },
          });
        });
      }

      // Step 5: Apply updates and insert logs
      if (userUpdates.length > 0) {
        await this.UserModel.bulkWrite(userUpdates);
      }

      if (userActives.length > 0) {
        await this.UserActiveModel.insertMany(userActives);
      }

      if (messages.length > 0) {
        const msg = await this.MessageModel.insertMany(messages); // Save messages
        for (const m of msg) {
          this.socketGateway.server.emit('message.re', m);
        }
      }

      // Step 6: Reset clans
      await this.clanModel.updateMany(
        {},
        {
          $set: {
            score: 0,
          },
        },
      );

      // Step 7: Notify clients
      this.socketGateway.server.emit('user.reload', 'ok');
      this.socketGateway.server.emit('clan.reload', 'ok');

      this.logger.log('Top Clan rewards successfully distributed!');
    } catch (err: any) {
      this.logger.error('Error during Top Clan handling: ' + err.message);
    }
  }

  @OnEvent('top.user', { async: true })
  async handleTopUser() {
    try {
      // Step 1: Retrieve configuration
      const e_user_rank =
        await this.userService.findConfigWithName('e_user_rank');
      if (!e_user_rank) throw new Error('Không tìm thấy e_user_rank');
      const { winer = 7, prizes, require_s } = e_user_rank.option;

      // Step 2: Get top users meeting the requirements
      const topUsers = await this.UserModel.find({
        'meta.totalTrade': { $gt: require_s },
      })
        .sort({ 'meta.totalTrade': -1 })
        .limit(winer);

      // Step 3: Prepare updates, activities, and messages
      const userUpdates = [];
      const userActives = [];
      const messages = [];
      const now = new Date();

      topUsers.forEach((user, index) => {
        const prize = prizes[index] || 0; // Default to 0 if prize is undefined

        // Prepare user update
        userUpdates.push({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $inc: { money: prize },
            },
          },
        });

        // Prepare activity log
        userActives.push({
          uid: user.id,
          active: {
            name: 'top_day',
            top: index + 1,
            prize: prize,
            m_current: user.money,
            m_new: user.money + prize,
            timestamp: now,
          },
        });

        // Prepare notification message
        messages.push({
          uid: 'local',
          content: `Chúc mừng người chơi ${user.name} đã nhận được ${new Intl.NumberFormat(
            'vi',
          ).format(prize)} vàng từ giải thưởng TOP ${index + 1} Ngày`,
          server: 'all',
        });
      });

      // Step 4: Execute bulk operations
      if (userUpdates.length > 0) {
        await this.UserModel.bulkWrite(userUpdates); // Bulk update user data
      }

      if (userActives.length > 0) {
        await this.UserActiveModel.insertMany(userActives); // Save activity logs
      }

      if (messages.length > 0) {
        const msg = await this.MessageModel.insertMany(messages); // Save messages
        for (const m of msg) {
          this.socketGateway.server.emit('message.re', m);
        }
      }

      // Step 5: Reset fingerprint daily limits
      await this.FingerPrintModel.updateMany(
        {},
        { $set: { maxAccountInDay: 0 } },
      );

      // Step 6: Reset all user score
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

      // Step 7: Notify clients and log success
      this.socketGateway.server.emit('user.reload', 'ok');
      this.logger.log('Auto TOP User completed successfully.');
    } catch (err: any) {
      this.logger.error('Error during TOP User handling: ' + err.message);
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
      // Get current date and calculate yesterday's date
      const currentDate = new Date();
      const yesterday = new Date();
      yesterday.setDate(currentDate.getDate() - 1);

      // Set the time to match the ISODate format
      yesterday.setHours(0, 0, 0, 0); // Start of yesterday
      currentDate.setHours(0, 0, 0, 0); // Start of today

      this.logger.log(
        `Finding documents between ${yesterday.toISOString()} and ${currentDate.toISOString()}`,
      );

      // Perform the query with ISODate compatibility
      const result = await this.MiniGameModel.updateMany(
        {
          createdAt: { $gte: yesterday, $lt: currentDate }, // Replace 'dateField' with your actual ISODate field
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

      this.logger.log(
        `Auto Reset Mini Game Success! ${result.modifiedCount} documents were updated.`,
      );
    } catch (err: any) {
      this.logger.log('Err auto reset mini game: ' + err.message);
    }
  }

  @OnEvent('reset.vip.daily', { async: true })
  async handleResetVIP() {
    try {
      const currentDate = moment();

      // Get all users with active VIP
      const users = await this.UserModel.find({ 'meta.vip': { $gt: 0 } });

      const userUpdates = [];
      const userActives = [];
      const resetFields = {
        'meta.vip': 0,
        'meta.totalScore': 0,
        'meta.vipStartDate': null,
        'meta.vipExpiryDate': null,
      };

      for (const user of users) {
        const { vipExpiryDate, lastActiveDate } = user.meta;

        // Check if VIP has expired
        if (vipExpiryDate && moment(`${vipExpiryDate}`).isBefore(currentDate)) {
          // Add to bulk update
          userUpdates.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: resetFields },
            },
          });

          // Prepare userActive
          userActives.push({
            uid: user.id,
            active: {
              name: 'vip_expired',
              v_current: user.meta.vip,
              v_n: 0,
              m_current: user.money,
              m_new: user.money,
            },
          });

          continue;
        }

        // Check if user has been inactive for 7 days
        if (
          lastActiveDate &&
          moment(lastActiveDate).isBefore(moment().subtract(7, 'days'))
        ) {
          // Add to bulk update
          userUpdates.push({
            updateOne: {
              filter: { _id: user._id },
              update: { $set: resetFields },
            },
          });

          // Prepare userActive
          userActives.push({
            uid: user.id,
            active: {
              name: 'vip_inactive',
              v_current: user.meta.vip,
              v_n: 0,
              m_current: user.money,
              m_new: user.money,
            },
          });
        }
      }

      // Perform bulk updates
      if (userUpdates.length > 0) {
        await this.UserModel.bulkWrite(userUpdates);
      }

      if (userActives.length > 0) {
        await this.UserActiveModel.insertMany(userActives);
      }

      // Reset daily reward collection
      await this.UserModel.updateMany(
        {},
        {
          $set: {
            'meta.rewardDayCollected': [],
            'meta.rewardCollected': false,
          },
        },
      );

      // Notify clients for a global user reload
      this.socketGateway.server.emit('user.reload', 'ok');
      this.logger.log('Daily VIP check completed successfully.');
    } catch (error) {
      this.logger.error(`Error in daily VIP check: ${error.message}`);
    }
  }
}
