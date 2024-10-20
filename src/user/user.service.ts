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
        .find({ uid: ownerId, server: server })
        .sort({ updatedAt: -1 })
        .limit(limited)
        .skip(page * limited);

      // Count the total number of documents that match the query
      const totalItems = await this.userBetModel.countDocuments({
        uid: ownerId,
        server: server,
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
}
