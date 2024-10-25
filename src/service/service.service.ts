import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Service } from './schema/service.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { CancelService, CreateService } from './dto/dto.service';
import { SocketGateway } from 'src/socket/socket.gateway';

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<Service>,
    private readonly userService: UserService,
    private readonly socketGateWay: SocketGateway,
  ) {}

  private logger: Logger = new Logger('Service');
  private mapService: Map<string, any> = new Map();

  async handlerCreate(payload: CreateService) {
    const { amount, playerName, type, uid, server } = payload;
    try {
      const e_shop = await this.userService.findConfigWithName('e_shop');
      if (!e_shop) throw new Error('Không tìm thấy cài đặt e_shop');
      if (!e_shop.isEnable)
        throw new Error('Hệ thống nạp/rút hiện đang bảo trì!');
      const {
        min_gold = 50e6,
        min_rgold = 4,
        max_gold = 600e6,
        max_rgold = 40,
      } = e_shop.option;
      // Let Check old service isEnd?
      const old_s = await this.serviceModel
        .findOne({ playerName: playerName, uid: uid })
        .sort({ updatedAt: -1 });
      if (old_s && !old_s.isEnd)
        throw new Error(
          'Đơn giao dịch trước đó chưa kết thúc, xin vui lòng kiểm tra lại!',
        );
      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) throw new Error('Người dùng không tồn tại!');
      const { money, meta } = user;
      // Check limited;
      if (type === '0' || type === '1') {
        let { limitTrade } = user.meta;
        if (type === '0') {
          let withdraw_rgold = amount * 37e6;
          if (withdraw_rgold > limitTrade)
            throw new Error(
              'Bạn không thể rút quá hạn mức hôm nay, xin vui lòng tham gia Minigame để tăng điểm',
            );
        }
        if (type === '1') {
          let withdraw_gold = amount;
          if (withdraw_gold > limitTrade)
            throw new Error(
              'Bạn không thể rút quá hạn mức hôm nay, xin vui lòng tham gia Minigame để tăng điểm',
            );
        }
      }
      // Check Service Withdraw
      // Let minus money user with withdraw rgold
      if (type === '0') {
        let withdraw_rgold = amount * 37e6;
        if (amount < min_rgold)
          throw new Error(
            `Mức rút tối thiểu là ${new Intl.NumberFormat('vi').format(min_rgold)} thỏi vàng`,
          );
        if (amount > max_rgold)
          throw new Error(
            `Mức rút tối đa là ${new Intl.NumberFormat('vi').format(max_rgold)} thỏi vàng`,
          );
        if (user.money - withdraw_rgold <= 1)
          throw new Error('Số dư tối thiểu của bạn phải 1 vàng');
        // Update the user fields
        user.money = money - withdraw_rgold;
        user.meta = {
          ...meta, // Spread the existing meta object
          limitTrade: meta.limitTrade - withdraw_rgold,
          trade: meta.trade + withdraw_rgold,
        };
        // Let create active;
        await this.userService.createUserActive({
          uid: uid,
          active: {
            name: 'w_rgold',
            status: '0',
            m_current: user.money + withdraw_rgold,
            m_new: user.money,
          },
        });
      }
      // Let minus money user with withdraw gold
      if (type === '1') {
        let withdraw_gold = amount;
        if (amount < min_gold)
          throw new Error(
            `Mức rút tối thiểu là ${new Intl.NumberFormat('vi').format(min_gold)} vàng`,
          );
        if (amount > max_gold)
          throw new Error(
            `Mức rút tối đa là ${new Intl.NumberFormat('vi').format(max_gold)} vàng`,
          );
        if (user.money - withdraw_gold <= 1)
          throw new Error('Số dư của bạn không khả dụng');
        user.money = money - withdraw_gold;
        user.meta = {
          ...meta, // Spread the existing meta object
          limitTrade: meta.limitTrade - withdraw_gold,
          trade: meta.trade + withdraw_gold,
        };
        // Let create active;
        await this.userService.createUserActive({
          uid: uid,
          active: {
            name: 'w_gold',
            status: '0',
            m_current: user.money + withdraw_gold,
            m_new: user.money,
          },
        });
      }

      // Another Deposit ...
      if (type === '2' || type === '3') {
        await this.userService.createUserActive({
          uid,
          active: {
            name: type === '2' ? 'd_rgold' : 'd_gold',
            m_current: user.money,
            m_new: user.money,
          },
        });
      }

      // Let save user;
      // Mark meta as modified if needed (for Mongoose)
      user.markModified('meta');
      await user.save();
      const { pwd_h, ...res_user } = user.toObject();

      // / Let Create Service
      const n_service = await this.serviceModel.create({
        uid: uid,
        playerName: playerName,
        amount: amount,
        type,
        server,
      });

      // Let auto cancel;
      let autocCancel = setTimeout(async () => {
        await this.handlerCancelLocal(n_service.id);
      }, 600e3);
      // 600e3 = 600s = 10p
      // 10e3 = 10s = 0.6p
      this.addCancel(n_service.id, autocCancel);

      // save Log
      this.logger.log(
        `Service Create: UID:${uid} - Type: w_gold - Amount: ${amount}`,
      );

      // Send realtime;
      this.socketGateWay.server.emit('service.update', n_service.toObject());
      this.socketGateWay.server.emit('user.update', res_user);
      return {
        message: 'Bạn đã tạo giao dịch thành công',
      };
    } catch (error: any) {
      this.logger.log(
        `Err Service Create: UID:${uid} - Type: ${type} - Amount: ${amount} - Msg: ${error.message}`,
      );
      throw new HttpException(
        { message: error.message, code: 400 },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async handlerUpdate(payload: CancelService) {
    const { serviceId, uid } = payload;
    try {
      const target_s = await this.serviceModel.findById(serviceId);
      if (!target_s) throw new Error('Mã giao dịch không tồn tại');

      const target_u = await this.userService.findUserOption({ _id: uid });
      if (!target_u) throw new Error('Người dùng không tồn tại');

      if (target_s.uid !== target_u.id)
        throw new Error('Người dùng không tồn tại');

      if (target_s.isEnd) throw new Error('Giao dịch đã kết thúc');
      const { money, meta } = target_u;

      // Cancel Service;
      target_s.isEnd = true;
      target_s.status = '1';

      this.removeCancel(target_s.id);

      // refund user if that is type Service is withdraw
      const { type, amount } = target_s;
      // / Rgold
      if (type === '0') {
        let refund_rgold = amount * 1e6 * 37;
        // Save active
        await this.userService.createUserActive({
          uid,
          active: {
            name: 'cancel_w_rgold',
            m_current: target_u.money,
            m_new: target_u.money + refund_rgold,
            status: '1',
          },
        });

        target_u.money = money + refund_rgold;
        target_u.meta = {
          ...meta, // Spread the existing meta object
          limitTrade: meta.limitTrade + refund_rgold,
          trade: meta.trade - refund_rgold,
        };
        target_s.revice = refund_rgold;
      }

      // / Gold
      if (type === '1') {
        let refund_gold = amount;
        // Save active
        await this.userService.createUserActive({
          uid,
          active: {
            name: 'cancel_w_gold',
            m_current: target_u.money,
            m_new: target_u.money + refund_gold,
            status: '1',
          },
        });

        target_u.money = money + refund_gold;
        target_u.meta = {
          ...meta, // Spread the existing meta object
          limitTrade: meta.limitTrade + refund_gold,
          trade: meta.trade - refund_gold,
        };
        target_s.revice = refund_gold;
      }

      // Another deposit ...
      if (type === '2' || type === '3') {
        await this.userService.createUserActive({
          uid,
          active: {
            name: type === '2' ? 'cancel_d_rgold' : 'cancel_d_gold',
            m_current: target_u.money,
            m_new: target_u.money,
            status: '1',
          },
        });
      }

      // Save user;
      // Mark meta as modified if needed (for Mongoose)
      target_u.markModified('meta');
      await target_u.save();
      const { pwd_h, ...res_user } = target_u.toObject();

      // Update Service;
      await target_s.save();

      // Save log
      this.logger.log(`Cancel Service: UID:${uid} - ServiceId: ${serviceId}`);

      // Send data back
      this.socketGateWay.server.emit('service.update', target_s.toObject());
      this.socketGateWay.server.emit('user.update', res_user);
      return {
        message: 'Bạn đã hủy giao dịch thành công',
      };
    } catch (err: any) {
      this.logger.log(
        `Err Service Cancel: UID: ${uid} - ServiceId: ${serviceId} - Msg: ${err.message}`,
      );
      throw new HttpException(
        { message: err.message, code: 400 },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async handlerCancelLocal(serviceId: string) {
    try {
      const target_s = await this.serviceModel.findById(serviceId);
      if (!target_s) throw new Error('Service not found');

      let uid = target_s.uid.toString();

      const target_u = await this.userService.findUserOption({ _id: uid });
      if (!target_u) throw new Error('Người dùng không tồn tại');

      if (target_s.isEnd) throw new Error('Giao dịch đã kết thúc');
      const { money, meta } = target_u;
      // Cancel Auto Service
      this.removeCancel(serviceId);

      // Cancel Service;
      target_s.isEnd = true;
      target_s.status = '1';

      // refund user if that is type Service is withdraw
      const { type, amount } = target_s;
      // / Rgold
      if (type === '0') {
        let refund_rgold = amount * 1e6 * 37;
        // Save active
        await this.userService.createUserActive({
          uid,
          active: {
            name: 'cancel_w_rgold',
            m_current: target_u.money,
            m_new: target_u.money + refund_rgold,
            status: '1',
          },
        });

        target_u.money = money + refund_rgold;
        target_u.meta = {
          ...meta, // Spread the existing meta object
          limitTrade: meta.limitTrade + refund_rgold,
          trade: meta.trade - refund_rgold,
        };
        target_s.revice = refund_rgold;
      }

      // / Gold
      if (type === '1') {
        let refund_gold = amount;
        // Save active
        await this.userService.createUserActive({
          uid,
          active: {
            name: 'cancel_w_gold',
            m_current: target_u.money,
            m_new: target_u.money + refund_gold,
            status: '1',
          },
        });

        target_u.money = money + refund_gold;
        target_u.meta = {
          ...meta, // Spread the existing meta object
          limitTrade: meta.limitTrade + refund_gold,
          trade: meta.trade - refund_gold,
        };
        target_s.revice = refund_gold;
      }

      // Another deposit ...
      if (type === '2' || type === '3') {
        await this.userService.createUserActive({
          uid,
          active: {
            name: type === '2' ? 'cancel_d_rgold' : 'cancel_d_gold',
            m_current: target_u.money,
            m_new: target_u.money,
            status: '1',
          },
        });
      }

      // Save user;
      // Mark meta as modified if needed (for Mongoose)
      target_u.markModified('meta');
      await target_u.save();
      const { pwd_h, ...res_user } = target_u.toObject();

      // Update Service;
      await target_s.save();

      // Save log
      this.logger.log(
        `Auto Cancel Service: UID:${uid} - ServiceId: ${serviceId}`,
      );

      // Send data back
      this.socketGateWay.server.emit('service.update', target_s.toObject());
      this.socketGateWay.server.emit('user.update', res_user);
    } catch (err: any) {
      this.logger.log('Err Cancel Service Auto: ', err.message);
      this.removeCancel(serviceId);
    }
  }

  async history(payload: { page: number; limited: number; ownerId: string }) {
    const { ownerId, page, limited } = payload;
    try {
      // Fetch the paginated user activities
      const services = await this.serviceModel
        .find({ uid: ownerId })
        .sort({ updatedAt: -1 })
        .limit(limited)
        .skip(page * limited);

      // Count the total number of documents that match the query
      const totalItems = await this.serviceModel.countDocuments({
        uid: ownerId,
      });
      return {
        data: services,
        page: page,
        limited: limited,
        skip: page * limited,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limited),
      };
    } catch (err: any) {
      this.logger.log(`Err History: ${ownerId} - Msg: ${err.message}`);
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  //TODO ———————————————[Zone Auto Cancel Service]———————————————
  async addCancel(serviceId: string, timeOutId: any) {
    try {
      this.mapService.set(serviceId, timeOutId);
      this.logger.log('Add New Service Auto');
      return;
    } catch (err: any) {}
  }

  async removeCancel(serviceId: string) {
    try {
      if (this.mapService.has(serviceId)) {
        let auto = this.mapService.get(serviceId);
        clearTimeout(auto);
        this.mapService.delete(serviceId);
      }
      this.logger.log('Remove Service is success');
    } catch (err: any) {
      this.logger.log('Err Remove Service Auto: ', err.message);
    }
  }

  //TODO ———————————————[Tranfer & Diamon]———————————————
  async tranferMoney(payload: {
    targetId: string;
    amount: number;
    server: string;
    ownerId: string;
  }) {
    try {
      const { amount, ownerId, server, targetId } = payload;
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');

      const target = await this.userService.findUserOption({
        _id: targetId,
        server: server,
      });
      if (!target) throw new Error('Người dùng không tồn tại');

      if (owner.money - amount <= 1)
        throw new Error('Số dư tối thiểu còn lại là 1 vàng');
      if (owner.meta.vip < 1) throw new Error('Bạn phải đạt tối thiểu VIP 1');
      // save active;
      await this.userService.createUserActive({
        uid: ownerId,
        active: {
          name: 'tranfer_f',
          m_current: owner.money,
          m_new: owner.money + amount,
          toId: targetId,
          to_meta: target.meta,
          to_name: target.name,
        },
      });

      await this.userService.createUserActive({
        uid: targetId,
        active: {
          name: 'tranfer_t',
          m_current: target.money,
          m_new: target.money + amount,
          fromId: ownerId,
          from_meta: owner.meta,
          from_name: owner.name,
        },
      });
      // Update user;
      owner.money -= amount;
      target.money += amount;
      await owner.save();
      await target.save();

      let res_o_u = owner.toObject();
      let res_t_u = target.toObject();
      delete res_o_u.pwd_h;
      delete res_t_u.pwd_h;
      this.socketGateWay.server.emit('user.update.bulk', [res_o_u, res_t_u]);
      return {
        message: `Bạn đã chuyển thành công ${new Intl.NumberFormat('vi').format(amount)} vàng cho người chơi ${target.name}`,
      };
    } catch (err: any) {
      this.logger.log(`Err Tranfer Money: ${err.message}`);
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  async exchangeDiamon(payload: { diamon: number; ownerId: string }) {
    try {
      const { diamon, ownerId } = payload;
      const e_reward = await this.userService.findConfigWithName('e_reward');
      const { exchange = 1e6 } = e_reward.option;
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');
      if (owner.diamon - diamon < 0)
        throw new Error('Số Gem của bạn hiện không khả dụng');
      if (owner.meta.vip < 1) throw new Error('Bạn phải đạt tối thiểu VIP 1');

      let new_money = diamon * exchange;
      // save active;
      await this.userService.createUserActive({
        uid: ownerId,
        active: {
          name: 'exchange_diamon',
          m_current: owner.money,
          m_new: new_money,
          d_current: owner.diamon,
          d_new: owner.diamon - diamon,
        },
      });

      owner.diamon -= diamon;
      owner.money += new_money;
      await owner.save();

      const { pwd_h, ...res_u } = owner.toObject();
      this.socketGateWay.server.emit('user.update', res_u);
      return {
        message: `Bạn đã đổi thành công ${diamon} Gem thành ${new Intl.NumberFormat('vi').format(new_money)} vàng`,
      };
    } catch (err: any) {
      this.logger.log(`Err Exchange Diamon: ${err.message}`);
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }
}
