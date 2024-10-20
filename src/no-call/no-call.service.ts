import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Clan } from 'src/clan/schema/clan.schema';
import { Message } from 'src/message/schema/message.schema';
import { MiniGame } from 'src/mini-game/schema/mini.schema';
import { Service } from 'src/service/schema/service.schema';
import { EConfig } from 'src/user/schema/config.schema';
import { User } from 'src/user/schema/user.schema';
import { UserBet } from 'src/user/schema/userBet.schema';

@Injectable()
export class NoCallService {
  constructor(
    @InjectModel(Message.name)
    private readonly MessageModel: Model<Message>,
    @InjectModel(MiniGame.name)
    private readonly MiniGameModel: Model<MiniGame>,
    @InjectModel(User.name)
    private readonly UserModel: Model<User>,
    @InjectModel(EConfig.name)
    private readonly EConfigModel: Model<EConfig>,
    @InjectModel(UserBet.name)
    private readonly UserBetModel: Model<UserBet>,
    @InjectModel(Clan.name)
    private readonly ClanModel: Model<Clan>,
  ) {}

  //TODO ———————————————[Clan Zone ]———————————————
  async listClans() {
    return await this.ClanModel.find();
  }

  async rankClan() {
    return await this.ClanModel.find().sort({ score: -1 }).limit(5);
  }

  //TODO ———————————————[User Zone]———————————————
  async rankUser() {
    const users = await this.UserModel.find()
      .sort({ 'meta.totalTrade': -1 })
      .limit(7);
    const res_users = users.map((u) => {
      const { name, meta } = u.toObject();
      const { totalTrade, avatar } = meta;
      return { name, meta: { totalTrade, avatar } };
    });
    return res_users;
  }

  //TODO ———————————————[EConfig]———————————————
  async listEConfig() {
    return await this.EConfigModel.find();
  }

  //TODO ———————————————[Message]———————————————
  async listMessage(server: string) {
    return await this.MessageModel.find({ server: server })
      .sort({ updatedAt: -1 })
      .limit(10);
  }

  //TODO ———————————————[Member Clan]———————————————
  async listClanMember(clanId: string) {
    const users = await this.UserModel.find({ 'meta.clanId': clanId }).sort({
      updatedAt: -1,
    });
    const res_u = users.map((u) => {
      const { name, meta, money } = u;
      return { name, meta, money };
    });
    return res_u;
  }

  //TODO ———————————————[User Bet]———————————————
  async listUserBet(server: string, limited: number) {
    return await this.UserBetModel.find({ server: server })
      .sort({ updatedAt: -1 })
      .limit(limited);
  }

  async minigame(server: string) {
    return await this.MiniGameModel.findOne({
      server: server,
      isEnd: false,
    }).sort({ updatedAt: -1 });
  }
}
