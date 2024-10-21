import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SchemaTypes } from 'mongoose';
import { MiniGame } from './schema/mini.schema';
import { UserService } from 'src/user/user.service';
import { Cancel, Place, typeBet, typePlace } from './dto/dto.mini';
import * as moment from 'moment';
import { SocketClientService } from 'src/socket/socket.service';
import { SocketGateway } from 'src/socket/socket.gateway';
import { UserBet } from 'src/user/schema/userBet.schema';
@Injectable()
export class MiniGameService {
  constructor(
    @InjectModel(MiniGame.name)
    private readonly miniGameModel: Model<MiniGame>,
    private userService: UserService,
    private socketClientService: SocketClientService,
    private socketGateway: SocketGateway,
  ) {}

  private logger: Logger = new Logger('MiniGame');

  async placeBet(payload: Place) {
    const { betId, uid, amount, place, server, typeBet } = payload;
    try {
      // Check Minigame is avaible
      const e_bet = await this.userService.findConfigWithName('e_bet');
      const option = e_bet.option;
      if (!e_bet.isEnable) throw new Error('Hệ thống cược đang bảo trì!');
      const {
        timePause = [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
        enable = [
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
        timePause24 = 15,
        enable24 = false,
      } = option;
      const a_game = await this.miniGameModel.findById(betId);
      if (!a_game) throw new Error('Mã phiên BET không tồn tại');
      if (a_game.isEnd) throw new Error('Phiên BET đã kết thúc');

      // Query TimePause BET
      let timeEnd = moment(`${a_game.timeEnd}`).unix();
      let current_time = moment().unix();

      // Query Config Bet SV:
      let index_sv = ['1', '2', '3', '4', '5', '6', '7'].includes(server)
        ? parseInt(server, 10) - 1
        : server === '8'
          ? 7
          : ['11', '12', '13'].includes(server)
            ? parseInt(server, 10) - 3
            : 24;
      if (index_sv < 24) {
        let isEnable = enable[index_sv] ?? false;
        let isTimePause = timePause[index_sv] ?? 15;
        if (!isEnable)
          throw new Error(
            `Máy Chủ ${server}: Đang bảo trì, xin vui lòng về máy chủ 24`,
          );
        if (timeEnd - current_time < isTimePause)
          throw new Error('Phiên BET đã đóng cược');
      } else {
        if (!enable24)
          throw new Error(
            `Máy Chủ ${server}: Đang bảo trì, xin vui lòng về các máy chủ khác`,
          );
        if (timeEnd - current_time < timePause24)
          throw new Error('Phiên BET đã đóng cược');
      }

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại');
      // Query Balance User;
      if (user.money - amount <= 0) throw new Error('Số dư không khả dụng');

      // Check Total User Bet in the server
      let total_userBet = await this.userService.findUserBetOption({
        uid: uid,
        betId: betId,
        isEnd: false,
      });
      let sum_userBet = total_userBet.reduce(
        (sum, a) => sum + (a.amount ?? 0),
        0,
      );
      let isCurrentServer = ['24', server].includes(user.server);

      // Min
      if (amount < option.min)
        throw new Error(
          `Vàng cược tối thiểu là ${new Intl.NumberFormat('vi').format(option.min)} vàng`,
        );
      if (!isCurrentServer) {
        let { max, sum } = option;
        // Max
        if (amount > max)
          throw new Error(
            `Vàng cược tối đa là ${new Intl.NumberFormat('vi').format(max)} vàng`,
          );
        if (sum_userBet + amount > sum)
          throw new Error(
            `Tổng vàng cược tối đa là ${new Intl.NumberFormat('vi').format(sum)} vàng`,
          );
      } else {
        let { max_diff, sum_diff } = option;
        // Max
        if (amount > max_diff)
          throw new Error(
            `Vàng cược tối đa là ${new Intl.NumberFormat('vi').format(max_diff)} vàng`,
          );
        if (sum_userBet + amount > sum_diff)
          throw new Error(
            `Tổng vàng cược tối đa là ${new Intl.NumberFormat('vi').format(sum_diff)} vàng`,
          );
      }

      if (typeBet !== 'g') {
        let place_cl_total = await this.userService.findUserBetOption({
          uid: uid,
          betId: betId,
          server: server,
          isEnd: false,
          typeBet: {
            $in: ['cl', 'x'],
          },
        });
        let isValidataPlace = this.isValidBet(place, place_cl_total);
        if (!isValidataPlace) throw new Error('Bạn không thể đặt 2 cầu');
      }

      if (typeBet === 'g') {
        let place_g_total = await this.userService.findUserBetOption({
          uid: uid,
          betId: betId,
          server: server,
          isEnd: false,
          typeBet: 'g',
        });
        if (place_g_total.length + 1 > option.max_g)
          throw new Error(`Bạn có thể dự đoán tối đa ${option.max_g} lần`);
      }

      // Save active
      const userActive = await this.userService.createUserActive({
        uid: uid,
        active: {
          name: 'place_bet',
          amount: amount,
          place: place,
          typeBet: typeBet,
          m_current: user.money,
          m_new: user.money - amount,
        },
      });
      // Let minus money of user;
      user.money -= amount;
      user.markModified('meta');
      await user.save();
      const { pwd_h, ...res_u } = user.toObject();
      // Create userBet
      const userBet = await this.userService.createUserBet({
        amount,
        betId,
        place,
        server,
        typeBet,
        uid,
        meta: {
          name: user.name,
          avatar: user.meta.avatar ?? null,
        },
      });

      // Update Minigame;
      let { c = 0, l = 0, t = 0, x = 0 } = a_game.resultUser;
      let split_place = this.split_place_bet(typeBet, amount, place);
      a_game.resultUser = {
        c: c + split_place.c,
        l: l + split_place.l,
        t: t + split_place.t,
        x: x + split_place.x,
      };

      a_game.markModified('meta');
      await a_game.save();
      // TODO Send to sv for reSend all client
      this.socketClientService.sendMessageToServer(
        'mini.server.24.re',
        a_game.id,
      );
      this.socketGateway.server.emit('userbet.update', userBet.toObject());
      this.socketGateway.server.emit(
        'userActive.update',
        userActive.toObject(),
      );
      return {
        message: 'Bạn đã tham gia cược thành công',
        user: res_u,
      };
    } catch (err: any) {
      this.logger.log(
        `Err Place: UID: ${uid} - betId: ${betId} - Msg: ${err.message}`,
      );
      throw new HttpException(
        { message: err.message, code: 400 },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async cancelPlaceBet(payload: Cancel) {
    const { userBetId, uid } = payload;
    try {
      const e_bet = await this.userService.findConfigWithName('e_bet');
      const option = e_bet.option;

      //   Query bet is avaible;
      const userBet = await this.userService.findUserBetWithId(userBetId);
      if (!userBet) throw new Error('Mã cược không tồn tại');

      const a_game = await this.miniGameModel.findById(userBet.betId);
      if (!a_game) throw new Error('Phiên cược không tồn tại');

      if (a_game.isEnd) throw new Error('Phiên cược đã kết thúc');

      let timeEnd = moment(`${a_game.timeEnd}`).unix();
      let current_time = moment().unix();
      if (timeEnd - current_time <= option['timePause'])
        throw new Error(
          'Phiên cược đã đóng, bạn không thể hủy cược vào lúc này',
        );

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại');

      userBet.isEnd = true;
      userBet.status = 1;
      userBet.revice = userBet.amount;
      userBet.result = '';
      userBet.markModified('meta');
      await userBet.save();

      //   refund money to user;
      let refund_money = userBet.amount;
      const userActive = await this.userService.createUserActive({
        uid,
        active: {
          name: 'cancel_bet',
          userBetId,
          m_current: user.money,
          m_new: user.money + refund_money,
        },
      });

      user.money += refund_money;
      user.markModified('meta');
      await user.save();
      const { pwd_h, ...res_u } = user.toObject();

      // Update Minigame;
      let { c = 0, l = 0, t = 0, x = 0 } = a_game.resultUser;
      let split_place = this.split_place_bet(
        userBet.typeBet,
        userBet.amount,
        userBet.place,
      );
      a_game.resultUser = {
        c: c - split_place.c,
        l: l - split_place.l,
        t: t - split_place.t,
        x: x - split_place.x,
      };

      a_game.markModified('meta');
      await a_game.save();
      // TODO Send to sv for reSend all client
      this.socketClientService.sendMessageToServer(
        'mini.server.24.re',
        a_game.id,
      );

      this.socketGateway.server.emit('userbet.update', userBet.toObject());
      this.socketGateway.server.emit('user.update', res_u);
      this.socketGateway.server.emit(
        'userActive.update',
        userActive.toObject(),
      );

      return {
        message: 'Bạn đã hủy cược thành công',
        user: res_u,
        userBet: userBet.toObject(),
      };
    } catch (err: any) {
      this.logger.log(
        `Err Cancel: UID: ${uid} - userBetId: ${userBetId} - Msg: ${err.message}`,
      );
      throw new HttpException(
        { message: err.message, code: 400 },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // split place to typeBet;
  split_place_bet(typeBet: typeBet, amount: number, place: typePlace) {
    let total_place = { c: 0, l: 0, t: 0, x: 0 };
    if (typeBet === 'g') return total_place;
    if (typeBet === 'cl') {
      if (place === 'C') total_place.c = amount;
      if (place === 'L') total_place.l = amount;
      if (place === 'T') total_place.t = amount;
      if (place === 'X') total_place.x = amount;
      return total_place;
    } else {
      return { t: amount / 2, x: amount / 2, c: 0, l: 0 };
    }
  }

  isValidBet(newBet: string, oldBets: UserBet[]): boolean {
    // Tách cược mới thành các phần
    const newBetParts = newBet.split('');

    for (const bet of oldBets) {
      // Tách cược cũ thành các phần
      const oldBetParts = bet.place.split('');

      // Kiểm tra từng phần của cược mới với từng phần của cược cũ
      for (const oldPart of oldBetParts) {
        for (const newPart of newBetParts) {
          if (
            (oldPart === 'C' && newPart === 'L') ||
            (oldPart === 'L' && newPart === 'C') ||
            (oldPart === 'T' && newPart === 'X') ||
            (oldPart === 'X' && newPart === 'T')
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }
}

//
