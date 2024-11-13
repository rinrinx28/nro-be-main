import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { UserActive } from './schema/userActive.schema';
import { Model } from 'mongoose';
import {
  CancelUserBet,
  CreateEConfig,
  CreateUser,
  CreateUserActive,
  CreateUserBet,
  UpdateEConfig,
} from './dto/dto';
import { EConfig } from './schema/config.schema';
import { UserBet } from './schema/userBet.schema';
import moment from 'moment';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(UserActive.name)
    private readonly userActiveModel: Model<UserActive>,
    @InjectModel(EConfig.name)
    private readonly eConfigModel: Model<EConfig>,
    @InjectModel(UserBet.name)
    private readonly userBetModel: Model<UserBet>,
  ) {}

  // TODO User Zone
  async createUser(payload: CreateUser) {
    return await this.userModel.create(payload);
  }

  async updateUserOption(filter: any, payload: any) {
    return await this.userModel.findOneAndUpdate(filter, payload, {
      new: true,
      upsert: true,
    });
  }

  async findUserOption(payload: any) {
    return await this.userModel.findOne(payload);
  }

  // TODO User Active Zone
  async createUserActive(payload: CreateUserActive) {
    return await this.userActiveModel.create(payload);
  }

  async getUserActive(uid: string) {
    const userActive = await this.userActiveModel
      .find({ uid: uid })
      .sort({ updatedAt: -1 });
    return userActive;
  }

  async findUsersWithOption(payload: any) {
    return await this.userModel.find(payload);
  }

  //TODO ———————————————[EConfig Zone]———————————————
  async createConfig(payload: CreateEConfig) {
    return await this.eConfigModel.create(payload);
  }

  async updateConfig(payload: UpdateEConfig) {
    const { id, ...data } = payload;
    return await this.eConfigModel.findByIdAndUpdate(payload.id, data, {
      new: true,
      upsert: true,
    });
  }

  async findConfigWithName(name: string) {
    return await this.eConfigModel.findOne({ name: name });
  }

  //TODO ———————————————[UserBet Zone]———————————————
  async createUserBet(payload: CreateUserBet) {
    return await this.userBetModel.create(payload);
  }

  async cancelUserBet(payload: CancelUserBet) {
    const { id, ...data } = payload;
    return await this.userBetModel.findByIdAndUpdate(id, data, {
      new: true,
      upsert: true,
    });
  }

  async findUserBetWithId(id: any) {
    return await this.userBetModel.findById(id);
  }

  async findUserBetOption(payload: any) {
    return await this.userBetModel.find(payload).sort({ updatedAt: -1 });
  }

  //TODO ———————————————[History Zone]———————————————
  async historyUserBet(payload: {
    page: number;
    limited: number;
    ownerId: string;
    server: string;
  }) {
    try {
      const { limited, ownerId, page, server } = payload;
      // Fetch the paginated user activities
      const userBets = await this.userBetModel
        .find({ uid: ownerId, ...(server === 'all' ? {} : { server }) })
        .sort({ updatedAt: -1 })
        .limit(limited)
        .skip(page * limited);

      // Count the total number of documents that match the query
      const totalItems = await this.userBetModel.countDocuments({
        uid: ownerId,
        ...(server === 'all' ? {} : { server }),
      });
      return {
        data: userBets,
        page: page,
        limited: limited,
        skip: page * limited,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limited),
      };
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  async historyUserActive(payload: {
    page: number;
    limited: number;
    ownerId: string;
  }) {
    try {
      const { limited, ownerId, page } = payload;
      // Fetch the paginated user activities
      const userActives = await this.userActiveModel
        .find({ uid: ownerId })
        .sort({ updatedAt: -1 })
        .limit(limited)
        .skip(page * limited);

      // Count the total number of documents that match the query
      const totalItems = await this.userActiveModel.countDocuments({
        uid: ownerId,
      });
      return {
        data: userActives,
        page: page,
        limited: limited,
        skip: page * limited,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limited),
      };
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  //TODO ———————————————[Reward]———————————————
  // Xử lý nhận thưởng VIP
  async claimVipReward(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) throw new Error('User not found');

      const eReward = await this.eConfigModel.findOne({ name: 'e_reward' });
      const { vipLevels } = eReward.option;

      const { vip, rewardCollected } = user.meta;
      const isRewardCollected = rewardCollected || false;
      const totalTrade = user.meta.totalTrade || 0;

      // Kiểm tra xem người dùng có đủ điều kiện nhận phần thưởng VIP
      if (isRewardCollected) {
        throw new Error('Bạn đã nhận phần thưởng VIP hôm nay');
      }

      const vipLevel = vipLevels.find((level) => level.level === vip);
      if (!vipLevel)
        throw new Error(
          'Không tìm thấy phần thưởng VIP, xin vui lòng liên hệ ban quản trị!',
        );

      if (totalTrade < vipLevel.dailyPointsTarget)
        throw new Error(
          `Bạn còn thiếu ${new Intl.NumberFormat('vi').format(vipLevel.dailyPointsTarget - totalTrade)} để nhận phần thưởng này`,
        );

      // Save active
      await this.userActiveModel.create({
        uid: userId,
        active: {
          name: 'reward_vip',
          m_current: user.money,
          m_new: user.money + vipLevel.money,
        },
      });

      // Cấp thưởng VIP (ở đây là "money" theo bảng cấu hình)
      user.money += vipLevel.money;
      user.meta.rewardCollected = true; // Lưu lại VIP đã nhận

      user.markModified('meta');
      await user.save();
      const { pwd_h, ...res_u } = user.toObject();
      return {
        success: true,
        message: `Bạn đã nhận phần thưởng VIP ${vip} thành công`,
        data: res_u,
      };
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  // Xử lý nhận thưởng hàng ngày
  async claimDailyReward(userId: string, index: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) throw new Error('Người dùng không tồn tại');

      const eReward = await this.eConfigModel.findOne({ name: 'e_reward' });
      const { daily } = eReward.option;

      const { rewardDayCollected = [] } = user.meta;

      const isRewardDayCollected =
        rewardDayCollected.find((r) => r.index === parseInt(index, 10))
          ?.isReward ?? false;

      // Kiểm tra nếu người dùng đã nhận thưởng ngày hôm nay
      if (isRewardDayCollected) {
        throw new Error('Bạn đã hoàn thành nhiệm vụ này trước đó');
      }

      const totalTrade = user.meta.totalTrade || 0;

      // Tìm phần thưởng hàng ngày dựa trên số điểm
      const dailyReward = daily[parseInt(index)];
      if (!dailyReward) {
        throw new Error(
          'Đã xảy ra lỗi đối với Phần Thưởng Mỗi Ngày, xin vui lòng liên hệ với ban quản trị!',
        );
      }

      if (totalTrade < dailyReward.dailyPointsTarget)
        throw new Error(
          `Bạn còn thiếu ${new Intl.NumberFormat('vi').format(dailyReward.dailyPointsTarget - totalTrade)} để nhận phần thưởng này`,
        );

      // Save active
      await this.userActiveModel.create({
        uid: userId,
        active: {
          name: 'reward_daily',
          m_current: user.money,
          m_new: user.money + dailyReward.money,
        },
      });
      // Cấp thưởng hàng ngày
      user.money += dailyReward.money;
      user.meta.rewardDayCollected = [
        ...rewardDayCollected,
        { index: parseInt(index), isReward: true },
      ];

      user.markModified('meta');
      await user.save();
      const { pwd_h, ...res_u } = user.toObject();
      return {
        success: true,
        message: `Bạn đã nhận thưởng nhiệm vụ ${parseInt(index, 10) + 1} thành công`,
        data: res_u,
      };
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }
}
