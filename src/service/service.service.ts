import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Service } from './schema/service.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, now } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { CancelService, CreateService } from './dto/dto.service';
import { SocketGateway } from 'src/socket/socket.gateway';
import { Mutex } from 'async-mutex';
import { Spam } from './schema/spam.schema';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import moment from 'moment';
import { SocketGatewayAuth } from 'src/socket/socket.gateway.jwt';
import { SocketCronService } from 'src/socket/socket.cron.service';
import { Cron } from './schema/cron.schema';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<Service>,
    @InjectModel(Cron.name)
    private readonly cronModel: Model<Cron>,
    private readonly userService: UserService,
    private readonly socketGateWay: SocketGateway,
    private readonly socketGateWayAuth: SocketGatewayAuth,
    private readonly socketCronService: SocketCronService,
    private readonly eventEmit: EventEmitter2,
    private readonly httpService: HttpService,
  ) {}

  private logger: Logger = new Logger('Service');
  private mapService: Map<string, any> = new Map();
  private readonly mutexMap = new Map<string, Mutex>();

  private validateTransactionLimits(
    type: string,
    amount: number,
    user: any,
    limits: {
      min_gold: number;
      min_rgold: number;
      max_gold: number;
      max_rgold: number;
    },
  ) {
    const { min_gold, min_rgold, max_gold, max_rgold } = limits;
    const tradeAmount = type === '0' ? amount * 37e6 : amount;
    const min = type === '0' ? min_rgold : min_gold;
    const max = type === '0' ? max_rgold : max_gold;

    if (tradeAmount > user.meta.limitTrade) {
      throw new Error(
        'Bạn không thể rút quá hạn mức hôm nay, xin vui lòng tham gia Minigame để tăng điểm',
      );
    }
    if (amount < min) {
      throw new Error(
        `Mức rút tối thiểu là ${new Intl.NumberFormat('vi').format(min)} thỏi vàng`,
      );
    }
    if (amount > max) {
      throw new Error(
        `Mức rút tối đa là ${new Intl.NumberFormat('vi').format(max)} thỏi vàng`,
      );
    }
    if (user.money - tradeAmount <= 1) {
      throw new Error('Số dư tối thiểu của bạn phải 1 vàng');
    }
  }

  private async createUserActive(
    uid: string,
    currentMoney: number,
    name: string,
    withdrawAmount: number = 0,
  ) {
    const newMoney = currentMoney - withdrawAmount;
    await this.userService.createUserActive({
      uid,
      active: {
        name,
        status: '0',
        m_current: currentMoney,
        m_new: newMoney,
        amount: withdrawAmount,
      },
    });
  }

  private logAndNotify(
    uid: string,
    type: string,
    amount: number,
    service: any,
    user: any,
    clientId: string,
  ) {
    this.logger.log(
      `Service Create: UID:${uid} - Type: ${type} - Amount: ${amount}`,
    );
    this.socketGateWay.server.emit('service.update', service.toObject());
    this.socketGateWay.server.emit('user.update', user);
  }

  @OnEvent('service.create', { async: true })
  async handlerCreate(payload: CreateService) {
    const { amount, playerName, type, uid, server, clientId } = payload;
    const parameter = `${uid}.create.service`;

    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();

    try {
      const eShopConfig = await this.userService.findConfigWithName('e_shop');
      if (!eShopConfig || !eShopConfig.isEnable) {
        throw new Error('Hệ thống nạp/rút hiện đang bảo trì!');
      }

      const { min_gold, min_rgold, max_gold, max_rgold } = eShopConfig.option;
      const oldService = await this.serviceModel
        .findOne({ uid })
        .sort({ updatedAt: -1 });

      if (oldService && !oldService.isEnd) {
        throw new Error(
          'Đơn giao dịch trước đó chưa kết thúc, xin vui lòng kiểm tra lại!',
        );
      }

      const user = await this.userService.findUserOption({ _id: uid });
      if (!user) {
        throw new Error('Người dùng không tồn tại!');
      }

      if (['0', '1'].includes(type)) {
        this.validateTransactionLimits(type, amount, user, {
          min_gold,
          min_rgold,
          max_gold,
          max_rgold,
        });
      }

      if (type === '0' || type === '1') {
        const withdrawAmount = type === '0' ? amount * 37e6 : amount;
        const activeName = type === '0' ? 'w_rgold' : 'w_gold';

        await this.createUserActive(
          user._id.toString(),
          user.money,
          activeName,
          withdrawAmount,
        );
        user.money -= withdrawAmount;
        user.meta.limitTrade -= withdrawAmount;
        user.meta.trade += withdrawAmount;
      } else if (type === '2' || type === '3') {
        await this.createUserActive(
          uid,
          user.money,
          type === '2' ? 'd_rgold' : 'd_gold',
          0,
        );
      }

      user.markModified('meta');
      await user.save();

      const sanitizedUser = this.sanitizeUser(user);
      const newService = await this.serviceModel.create({
        uid,
        playerName,
        amount,
        type,
        server,
      });
      this.logAndNotify(uid, type, amount, newService, sanitizedUser, clientId);
      this.eventEmit.emitAsync('notification.user.event', {
        uid: uid,
        message: 'Bạn đã tạo thành công giao dịch',
      });
      // Send auto cancel service
      this.socketCronService.sendMessageToServer('service.auto.create', {
        serviceId: newService.id,
      });

      // Send logs discord
      await this.sendLogsServices(`
          [Tạo ${type === '0' ? 'Rút Thỏi vàng' : type === '1' ? 'Rút vàng' : type === '2' ? 'Nạp thỏi vàng' : 'Nạp vàng'}] ServiceId: ${newService.id} - Tên hiển thị: ${user.username} - UserId: ${user.id} - Tên nhân vật: ${playerName} - Số thỏi/vàng: ${amount} - Server: ${newService.server}
        `);
    } catch (err: any) {
      this.logger.log(
        `Err Service Create: UID:${uid} - Type: ${type} - Amount: ${amount} - Msg: ${err.message}`,
      );
      this.eventEmit.emitAsync('notification.user.event', {
        uid: uid,
        message: err.message,
      });
    } finally {
      release();
    }
  }

  @OnEvent('service.cancel.client', { async: true })
  async handlerUpdateClient(payload: CancelService) {
    const { serviceId, uid } = payload;
    const parameter = `${uid}.update.service`;

    // Tạo hoặc tái sử dụng mutex cho người dùng
    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();

    try {
      // Xác thực giao dịch và người dùng
      const { service: targetService } =
        await this.validateServiceAndUserClient(serviceId, uid);

      if (targetService.isEnd) {
        throw new Error('Giao dịch đã kết thúc');
      }

      // Chặn gửi yêu cầu hủy giao dịch trong vòng 20 giây
      const cronJob = await this.cronModel.findOne({ serviceId: serviceId });
      if (cronJob) {
        let current = moment().unix();
        let update_time = moment(`${cronJob.cancelTime}`).unix();
        let timeDiff = current - update_time;
        if (timeDiff <= 120 && ['0', '1'].includes(targetService.type)) {
          throw new Error(
            `Giao dịch của bạn tạm khóa, xin vui lòng chờ sau ${timeDiff} giây`,
          );
        }
      }

      // Send msg cancel service
      this.socketCronService.sendMessageToServer(
        'service.auto.cancel',
        targetService.id,
      );
      this.logger.log(`Cancel Service: UID:${uid} - ServiceId: ${serviceId}`);
      const user = await this.userService.findUserOption({ _id: uid });
      // Send logs discord
      await this.sendLogsServices(`
        [Huỷ ${targetService.type === '0' ? 'Rút Thỏi vàng' : targetService.type === '1' ? 'Rút vàng' : targetService.type === '2' ? 'Nạp thỏi vàng' : 'Nạp vàng'}] ServiceId: ${targetService.id} - Tên hiển thị: ${user.username} - UserId: ${user.id} - Tên nhân vật: ${targetService.playerName} - ID Nhân vật: ${targetService.playerId} - Số thỏi/vàng: ${targetService.amount} - Server: ${targetService.server}
      `);
    } catch (err: any) {
      this.eventEmit.emitAsync('notification.user.event', {
        uid: uid,
        message: err.message,
      });
    } finally {
      release();
    }
  }

  async history(payload: { page: number; limited: number; ownerId: string }) {
    const { ownerId, page, limited } = payload;
    const parameter = `${ownerId}.view.service.history`; // Value will be lock

    // Create mutex if it not exist
    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();
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
    } finally {
      release();
    }
  }

  //TODO ———————————————[Zone Auto Cancel Service]———————————————
  async addCancel(serviceId: string, timeOutId: any) {
    try {
      // this.mapService.set(serviceId, timeOutId);
      // this.logger.log('Add New Service Auto');
      // return;
    } catch (err: any) {}
  }

  @OnEvent('remove.autocancel', { async: true })
  async removeCancel(serviceId: string) {
    try {
      // if (!this.mapService.has(serviceId)) {
      //   this.logger.log(`Service ID ${serviceId} not found in mapService.`);
      //   return;
      // }
      // let auto = this.mapService.get(serviceId);
      // if (auto) {
      //   clearTimeout(auto);
      //   this.mapService.delete(serviceId);
      //   this.logger.log(`Remove Service ${serviceId} is success`);
      // } else {
      //   this.logger.log(`No timeout found for Service ID ${serviceId}.`);
      // }
    } catch (err: any) {
      // this.logger.log('Err Remove Service Auto: ', err.message);
    }
  }

  //TODO ———————————————[Tranfer & Diamon]———————————————
  @OnEvent('service.tranfer.money', { async: true })
  async tranferMoney(payload: {
    targetId: string;
    amount: number;
    ownerId?: string;
    uid: string;
    clientId?: string;
  }) {
    const parameter = `${payload.ownerId}.tranferMoney`; // Value will be lock

    // Create mutex if it not exist
    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();
    const { amount, ownerId, targetId, clientId } = payload;
    try {
      const e_shop = await this.userService.findConfigWithName('e_shop');
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');

      const target = await this.userService.findUserOption({
        name: targetId,
        server: owner.server,
      });
      if (!target)
        throw new Error(`Người nhận không tồn tại ở máy chủ ${owner.server}`);

      if (owner.money - amount < 1)
        throw new Error('Số dư tối thiểu còn lại là 1 vàng');
      if (owner.meta.vip < 1) throw new Error('Bạn phải đạt tối thiểu VIP 1');
      if (amount > owner.meta.limitTrade)
        throw new Error(
          'Bạn không thể chuyển quá hạn mức hôm nay, xin vui lòng tham gia Minigame để tăng điểm',
        );
      if (owner?.meta?.rewardDayCollected?.length > 0) {
        let fee_tranfer = e_shop.option.fee_tranfer;
        let fee = amount * fee_tranfer;
        if (owner.money - fee < 1)
          throw new Error('Số dư tối thiểu còn lại là 1 vàng');
        // save active;
        await this.userService.createUserActive({
          uid: ownerId,
          active: {
            name: 'fee_tranfer',
            m_current: owner.money,
            m_new: owner.money - fee,
            amount: amount,
          },
        });
        owner.money -= fee;
      }
      // save active;
      await this.userService.createUserActive({
        uid: ownerId,
        active: {
          name: 'tranfer_f',
          m_current: owner.money,
          m_new: owner.money - amount,
          toId: target.id,
          to_meta: target.meta,
          to_name: target.name,
          amount: amount,
        },
      });

      await this.userService.createUserActive({
        uid: target.id,
        active: {
          name: 'tranfer_t',
          m_current: target.money,
          m_new: target.money + amount,
          fromId: ownerId,
          from_meta: owner.meta,
          from_name: owner.name,
          amount: amount,
        },
      });
      // Update user;
      owner.meta.trade += amount;
      owner.meta.limitTrade -= amount;
      owner.markModified('meta');
      owner.money -= amount;
      target.money += amount;
      await owner.save();
      await target.save();

      let res_o_u = owner.toObject();
      let res_t_u = target.toObject();
      delete res_o_u.pwd_h;
      delete res_t_u.pwd_h;
      this.socketGateWay.server.emit('user.update.bulk', [res_o_u, res_t_u]);
      this.eventEmit.emitAsync('notification.user.event', {
        uid: ownerId,
        message: `Bạn đã chuyển thành công ${new Intl.NumberFormat('vi').format(amount)} vàng cho người chơi ${target.name}`,
      });
      // this.socketGateWayAuth.server
      //   .to(clientId)
      //   .emit('service.tranfer.money.re', {});
      return;
    } catch (err: any) {
      this.logger.log(`Err Tranfer Money: ${err.message}`);
      this.socketGateWayAuth.server
        .to(clientId)
        .emit('service.tranfer.money.re', {
          message: err.message,
        });
    } finally {
      release();
    }
  }

  @OnEvent('service.exchange.diamon', { async: true })
  async exchangeDiamon(payload: {
    diamon: number;
    ownerId: string;
    clientId?: string;
  }) {
    const parameter = `${payload.ownerId}.exchangeDiamon`; // Value will be lock

    // Create mutex if it not exist
    if (!this.mutexMap.has(parameter)) {
      this.mutexMap.set(parameter, new Mutex());
    }

    const mutex = this.mutexMap.get(parameter);
    const release = await mutex.acquire();
    const { diamon, ownerId, clientId } = payload;
    try {
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
          diamon: diamon,
        },
      });

      owner.diamon -= diamon;
      owner.money += new_money;
      await owner.save();

      const { pwd_h, ...res_u } = owner.toObject();
      this.socketGateWay.server.emit('user.update', res_u);
      this.eventEmit.emitAsync('notification.user.event', {
        uid: ownerId,
        message: `Bạn đã đổi thành công ${diamon} Gem thành ${new Intl.NumberFormat('vi').format(new_money)} vàng`,
      });
      // this.socketGateWayAuth.server
      //   .to(clientId)
      //   .emit('service.exchange.diamon.re', {
      //     message: `Bạn đã đổi thành công ${diamon} Gem thành ${new Intl.NumberFormat('vi').format(new_money)} vàng`,
      //   });
      return;
    } catch (err: any) {
      this.logger.log(`Err Exchange Diamon: ${err.message}`);
      this.socketGateWayAuth.server
        .to(clientId)
        .emit('service.exchange.diamon.re', {
          message: err.message,
        });
    } finally {
      release();
    }
  }

  //TODO ———————————————[Something]———————————————
  sanitizeUser(user: any) {
    const { pwd_h, ...rest } = user.toObject();
    return rest;
  }

  calculateRefund(type: string, amount: number) {
    return type === '0' ? amount * 37e6 : amount;
  }

  async validateServiceAndUser(serviceId: any, uid: any) {
    const service = await this.serviceModel.findById(serviceId);
    const user = await this.userService.findUserOption({ _id: uid });
    if (!service) throw new Error('Mã giao dịch không tồn tại');
    if (!user) throw new Error('Người dùng không tồn tại');
    if (service.uid !== user.id) throw new Error('Người dùng không hợp lệ');
    let current = moment().unix();
    let update_time = moment(`${service.updatedAt}`).unix();
    if (current - update_time < 10)
      throw new Error('Bạn thao tác quá nhanh, xin vui lòng đợt một chút');
    return { service, user };
  }

  async validateServiceAndUserClient(serviceId: any, uid: any) {
    const service = await this.serviceModel.findById(serviceId);
    const user = await this.userService.findUserOption({ _id: uid });
    if (!service) throw new Error('Mã giao dịch không tồn tại');
    if (!user) throw new Error('Người dùng không tồn tại');
    if (service.uid !== user.id) throw new Error('Người dùng không hợp lệ');
    return { service, user };
  }

  async getListCron() {
    const entries = [...this.mapService.keys()]; // Chuyển đổi Iterator thành mảng.

    if (entries.length === 0) {
      return []; // Nếu không có entries, trả về mảng trống ngay lập tức.
    }

    try {
      // Tìm các dịch vụ với _id nằm trong entries
      const services = await this.serviceModel
        .find({ _id: { $in: entries } })
        .exec();
      return services;
    } catch (err) {
      this.logger.error('Error fetching services:', err);
      return [];
    }
  }

  //TODO ———————————————[Time Controller]———————————————
  addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
  }

  async sendLogsServices(msg: string) {
    try {
      await this.httpService.axiosRef.post(process.env.LOGS_SERVICE_DS_WB, {
        content: '```\n' + `${msg}\n` + '```',
        avatar_url: 'https://www.nrogame.me/image/icon.png',
      });
      return true;
    } catch (err: any) {
      this.logger.log('Đã xảy ra lỗi với Logs Nap/rut Discord');
      return true;
    }
  }
}
