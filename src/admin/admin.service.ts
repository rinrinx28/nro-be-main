import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schema/user.schema';
import { BotConfig } from './schema/bot-config.schema';
import { CreateBot } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(BotConfig.name)
    private readonly BotConfigModel: Model<BotConfig>,
  ) {}

  async createBot(data: CreateBot) {
    try {
      if (!data) throw new Error('Data error');
      const { isAvailable, meta, uid } = data;
      return await this.BotConfigModel.findOneAndUpdate(
        { uid: uid },
        {
          uid,
          isAvailable,
          meta,
        },
        {
          new: true,
          upsert: true,
        },
      );
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }
  async createBotBulk(data: CreateBot[]) {
    try {
      for (const d of data) {
        const { isAvailable, meta, uid } = d;
        await this.BotConfigModel.findOneAndUpdate(
          { uid: uid },
          {
            uid,
            isAvailable,
            meta,
          },
          {
            new: true,
            upsert: true,
          },
        );
      }
      return {
        message: 'Bạn đã kích hoạt bot thành công!',
      };
    } catch (err: any) {
      throw new HttpException({ message: err.message }, HttpStatus.BAD_REQUEST);
    }
  }

  async isValiAdmin(role: string) {}
}
