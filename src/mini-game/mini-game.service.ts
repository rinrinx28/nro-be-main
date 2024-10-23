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
import { MessageService } from 'src/message/message.service';
import { Jackpot } from './schema/jackpot';
@Injectable()
export class MiniGameService {
  constructor(
    @InjectModel(MiniGame.name)
    private readonly miniGameModel: Model<MiniGame>,
    @InjectModel(Jackpot.name)
    private readonly JackpotModel: Model<Jackpot>,
    private userService: UserService,
    private socketClientService: SocketClientService,
    private socketGateway: SocketGateway,
    private messageService: MessageService,
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
      // Kiểm tra xem server có nằm trong danh sách hợp lệ không
      let index_sv = null;

      if (['1', '2', '3', '4', '5', '6', '7'].includes(server)) {
        index_sv = parseInt(server, 10) - 1;
      } else if (server === '8') {
        index_sv = 7;
      } else if (['11', '12', '13'].includes(server)) {
        index_sv = parseInt(server, 10) - 3;
      } else {
        index_sv = 24; // Máy chủ mặc định là 24
      }

      if (index_sv < 24) {
        // Kiểm tra trạng thái máy chủ (enable) và thời gian tạm dừng (timePause) cho các máy chủ từ 1 đến 7 và 11 đến 13
        let isEnable = enable[index_sv] ?? false;
        let isTimePause = timePause[index_sv] ?? 15;

        // Nếu máy chủ không được phép, báo lỗi
        if (!isEnable) {
          throw new Error(
            `Máy Chủ ${server}: Đang bảo trì, xin vui lòng về máy chủ 24`,
          );
        }

        // Nếu thời gian hiện tại gần với thời gian kết thúc (timeEnd), báo lỗi đóng cược
        if (timeEnd - current_time < isTimePause) {
          throw new Error('Phiên BET đã đóng cược');
        }
      } else {
        // Xử lý riêng cho máy chủ 24
        if (!enable24) {
          throw new Error(
            `Máy Chủ ${server}: Đang bảo trì, xin vui lòng về các máy chủ khác`,
          );
        }

        // Kiểm tra thời gian tạm dừng cho máy chủ 24
        if (timeEnd - current_time < timePause24) {
          throw new Error('Phiên BET đã đóng cược');
        }
      }

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại');
      // Query Balance User;
      if (user.money - amount <= 0)
        throw new Error('Số dư tối thiểu của bạn phải 1 vàng');

      // Check Total User Bet in the server
      let total_userBet = await this.userService.findUserBetOption({
        uid: uid,
        betId: betId,
        isEnd: false,
        server: server,
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
      if (isCurrentServer) {
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

      // Update jackpot;
      if (server === '24') {
        const jackpot = await this.JackpotModel.findOne({ server: '24' });
        if (!jackpot) {
          const n_jackpot = await this.JackpotModel.create({
            server: '24',
            score: amount * e_bet.option.jackpot_sum,
          });
          this.socketGateway.server.emit(
            'jackpot.update',
            n_jackpot.toObject(),
          );
        } else {
          jackpot.score += amount * e_bet.option.jackpot_sum;
          await jackpot.save();
          this.socketGateway.server.emit('jackpot.update', jackpot.toObject());
        }
      }

      // Update Minigame;
      let { c = 0, l = 0, t = 0, x = 0 } = a_game.resultUser;
      let split_place = this.split_place_bet(typeBet, amount, place);
      a_game.resultUser = {
        c: c + split_place.c,
        l: l + split_place.l,
        t: t + split_place.t,
        x: x + split_place.x,
      };

      a_game.markModified('resultUser');
      await a_game.save();

      if (amount > 5e8) {
        let res_s = this.show_res(place);
        const msg = await this.messageService.createMSG({
          uid: 'local',
          server: server,
          content: `Người chơi ${user.name} đang chơi lớn ${new Intl.NumberFormat('vi').format(amount)} vàng vào ${res_s}`,
        });
        this.socketGateway.server.emit('message.re', msg);
      }
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

      //   Query bet is avaible;
      const userBet = await this.userService.findUserBetWithId(userBetId);
      if (!userBet) throw new Error('Mã cược không tồn tại');

      const a_game = await this.miniGameModel.findById(userBet.betId);
      if (!a_game) throw new Error('Phiên cược không tồn tại');

      if (a_game.isEnd) throw new Error('Phiên cược đã kết thúc');

      // Kiểm tra xem server có nằm trong danh sách hợp lệ không
      let server = userBet.server;
      let index_sv = null;
      // Query TimePause BET
      let timeEnd = moment(`${a_game.timeEnd}`).unix();
      let current_time = moment().unix();

      if (['1', '2', '3', '4', '5', '6', '7'].includes(server)) {
        index_sv = parseInt(server, 10) - 1;
      } else if (server === '8') {
        index_sv = 7;
      } else if (['11', '12', '13'].includes(server)) {
        index_sv = parseInt(server, 10) - 3;
      } else {
        index_sv = 24; // Máy chủ mặc định là 24
      }

      if (index_sv < 24) {
        // Kiểm tra trạng thái máy chủ (enable) và thời gian tạm dừng (timePause) cho các máy chủ từ 1 đến 7 và 11 đến 13
        let isEnable = enable[index_sv] ?? false;
        let isTimePause = timePause[index_sv] ?? 15;

        // Nếu máy chủ không được phép, báo lỗi
        if (!isEnable) {
          throw new Error(
            `Máy Chủ ${server}: Đang bảo trì, xin vui lòng về máy chủ 24`,
          );
        }

        // Nếu thời gian hiện tại gần với thời gian kết thúc (timeEnd), báo lỗi đóng cược
        if (timeEnd - current_time < isTimePause) {
          throw new Error('Phiên BET đã đóng cược');
        }
      } else {
        // Xử lý riêng cho máy chủ 24
        if (!enable24) {
          throw new Error(
            `Máy Chủ ${server}: Đang bảo trì, xin vui lòng về các máy chủ khác`,
          );
        }

        // Kiểm tra thời gian tạm dừng cho máy chủ 24
        if (timeEnd - current_time < timePause24) {
          throw new Error('Phiên BET đã đóng cược');
        }
      }

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại');

      userBet.isEnd = true;
      userBet.status = 1;
      userBet.revice = userBet.amount;
      userBet.result = '';
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

      // Update jackpot;
      if (server === '24') {
        const jackpot = await this.JackpotModel.findOne({ server: '24' });
        if (jackpot) {
          jackpot.score -= userBet.amount * e_bet.option.jackpot_sum;
          await jackpot.save();
          this.socketGateway.server.emit('jackpot.update', jackpot.toObject());
        }
      }

      a_game.markModified('resultUser');
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
      if (place === 'CT')
        total_place = { ...total_place, c: amount / 2, t: amount / 2 };
      if (place === 'LT')
        total_place = { ...total_place, l: amount / 2, t: amount / 2 };
      if (place === 'CX')
        total_place = { ...total_place, c: amount / 2, x: amount / 2 };
      if (place === 'LX')
        total_place = { ...total_place, l: amount / 2, x: amount / 2 };
      return total_place;
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

  show_res(res: string) {
    if (res === 'C') {
      return 'Chẵn';
    }
    if (res === 'L') {
      return 'Lẻ';
    }
    if (res === 'T') {
      return 'Tài';
    }
    if (res === 'X') {
      return 'Xỉu';
    }
    if (res === 'CT') {
      return 'Chẵn Tài';
    }
    if (res === 'CX') {
      return 'Chẵn Xỉu';
    }
    if (res === 'LT') {
      return 'Lẻ Tài';
    }
    if (res === 'LX') {
      return 'Lẻ Xỉu';
    }
    return res;
  }
}

//
