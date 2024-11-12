import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Clan } from './schema/clan.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClanMessage } from './schema/msgClan.schema';
import {
  AcpectClan,
  AddMember,
  CreateClan,
  CreateClanMSG,
  CreateInviteClan,
  DeleteClan,
  RemoveInviteClan,
  RemoveMember,
  TranferClan,
  UpdateClan,
} from './dto/dto.clan';
import { InviteClan } from './schema/invite.schema';
import { UserService } from 'src/user/user.service';
import { SocketGateway } from 'src/socket/socket.gateway';

@Injectable()
export class ClanService {
  constructor(
    @InjectModel(Clan.name)
    private readonly clanModel: Model<Clan>,
    @InjectModel(ClanMessage.name)
    private readonly clanMessageModel: Model<ClanMessage>,
    @InjectModel(InviteClan.name)
    private readonly inviteClanModel: Model<InviteClan>,
    private readonly userService: UserService,
    private readonly socketGateway: SocketGateway,
  ) {}

  private logger: Logger = new Logger('Clan');

  //TODO ———————————————[Chat Clan Zone]———————————————
  async createClanMSG(payload: CreateClanMSG) {
    return await this.clanMessageModel.create(payload);
  }

  async listMessage(clanId: string, ownerId: string) {
    try {
      const msg = await this.clanMessageModel.find({ clanId });
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');

      if (!owner.meta.clanId)
        throw new Error('Người dùng không ở trong một Bang Hội');
      if (clanId !== owner.meta.clanId)
        throw new Error('Bạn không thể xem tin nhắn của Bang Hội khác');
      return msg;
    } catch (err: any) {
      this.logger.log(`Err Msg Clan: Msg: ${err.message} - OwerId: ${ownerId}`);
      this.CutomHexception(err.message);
    }
  }

  //TODO ———————————————[Clan Zone]———————————————

  async createClan(payload: CreateClan) {
    const { ownerId, meta } = payload;
    try {
      const e_clan = await this.userService.findConfigWithName('e_clan');
      const { price, type } = e_clan.option;
      // Check owner;
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');

      let { clanId = null } = owner.meta;
      if (clanId)
        throw new Error('Bạn đã là một thành viên hoặc chủ bang hội khác');
      let index_price = type.findIndex((t) => t === meta.type);
      //   Get fee create clan;
      if (owner.money - price[index_price] <= 0)
        throw new Error('Bạn không đủ số dư để tạo Bang Hội');
      // create clan;
      const clan = await this.clanModel.create({ ...payload, member: 1 });
      // save clan in the user;
      owner.money -= price[index_price];
      owner.meta = {
        ...(owner.meta ?? {}),
        clanId: clan.id,
        timeJoin: new Date(),
        score: 0,
      };
      owner.markModified('meta');
      await owner.save();
      const { pwd_h, ...res_u } = owner.toObject();
      this.socketGateway.server.emit('clan.update', { ...clan.toObject() });
      this.socketGateway.server.emit('user.update', res_u);
      return {
        message: 'Bạn đã tạo Bang Hội thành công',
      };
    } catch (err: any) {
      this.logger.log(
        `Err Create Clan: Msg: ${err.message} - OwerId: ${ownerId}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async updateClan(payload: UpdateClan) {
    const { ownerId } = payload;
    try {
      const e_clan = await this.userService.findConfigWithName('e_clan');
      const { price, type } = e_clan.option;
      // Check owner;
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');

      let { clanId = null } = owner.meta;
      if (!clanId)
        throw new Error('Bạn đã là một thành viên hoặc chủ bang hội khác');

      if (clanId !== payload.clanId)
        throw new Error('Bạn không thể chỉnh sửa bang hội này');

      const clan = await this.clanModel.findById(clanId);
      if (!clan) throw new Error('Bang hội không tồn tại');

      if (ownerId !== clan.ownerId)
        throw new Error('Bạn không phải là chủ bang hội');

      let { description } = payload.data;
      clan.meta = {
        ...(clan.meta ?? {}),
        description: description,
      };
      clan.meta.description = description;

      if (payload.data.type && payload.data.type !== clan.meta.type) {
        let index_price = type.findIndex((t) => t === payload.data.type);
        if (owner.money - price[index_price] <= 0)
          throw new Error('Bạn không đủ số dư để đổi biểu tượng Bang Hội');
        owner.money -= price[index_price];
        owner.markModified('meta');
        await owner.save();
        clan.meta = {
          ...(clan.meta ?? {}),
          type: payload.data.type,
        };
      }

      clan.markModified('meta');
      await clan.save();
      const { pwd_h, ...res_u } = owner.toObject();
      this.socketGateway.server.emit('clan.update', { ...clan.toObject() });
      this.socketGateway.server.emit('user.update', res_u);
      return {
        message: 'Bạn đã cập nhật Bang hội thành công',
      };
    } catch (err: any) {
      this.logger.log(
        `Err Create Clan: Msg: ${err.message} - OwerId: ${ownerId}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async addMember(payload: AddMember) {
    const { memberId, ownerId } = payload;
    try {
      const e_clan = await this.userService.findConfigWithName('e_clan');
      const { max } = e_clan.option;
      // Check member is owner another clan;
      const member = await this.userService.findUserOption({ _id: memberId });
      if (!member) throw new Error('Người dùng không tồn tại');

      let { clanId = null } = member.meta;
      if (clanId) throw new Error('Bạn không thể thêm người này vào Bang hội');

      const clan = await this.clanModel.findById(payload.clanId);
      if (!clan) throw new Error('Bang hội không tồn tại');

      if (clan.member + 1 > max)
        throw new Error('Thành viên bang hội của bạn đã đạt tối đa');

      clan.member += 1;
      clan.markModified('meta');
      await clan.save();

      member.meta = {
        ...(member.meta ?? {}),
        clanId: payload.clanId,
        timeJoin: new Date(),
      };

      member.markModified('meta');
      await member.save();
      const { pwd_h, ...res_u } = member.toObject();

      // remove invite
      await this.removeInviteClanWithMemberId(memberId);
      this.socketGateway.server.emit('clan.update', { ...clan.toObject() });
      this.socketGateway.server.emit('user.update', res_u);
      return {
        message: `Bạn đã thêm thành công ${member.name} vào Bang Hội của bạn`,
      };
    } catch (err: any) {
      this.logger.log(
        `Err Add Member Clan: CLANID:${payload.clanId} - MEMBERID: ${memberId} - Owner:${ownerId} - Msg: ${err.message}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async removeMember(payload: RemoveMember) {
    const { memberId, ownerId } = payload;
    try {
      const member = await this.userService.findUserOption({ _id: memberId });
      if (!member) throw new Error('Người dùng không tồn tại');
      // Update clan;
      const clan = await this.clanModel.findById(payload.clanId);
      if (!clan) throw new Error('Bang hội không tồn tại');

      if (ownerId) {
        const owner = await this.userService.findUserOption({ _id: ownerId });
        if (!owner) throw new Error('Người dùng không tồn tại');
        let { clanId = null } = owner.meta;
        if (!clanId) throw new Error('Bạn không tham gia Bang hội');
        if (owner.id !== clan.ownerId)
          throw new Error('Bạn không phải là chủ bang hội');
      }

      if (!member.meta.clanId)
        throw new Error('Người dùng không ở trong một Bang hội');

      if (member.meta.clanId !== payload.clanId)
        throw new Error('Người dùng không ở trong Bang Hội này');

      // Delete score
      clan.score -= member.meta.score;
      // Delete info member in the clan
      let { clanId, timeJoin, score, ...meta } = member.meta;
      member.meta = meta;

      clan.member -= 1;

      // save clan
      clan.markModified('meta');
      await clan.save();
      // save member;
      member.markModified('meta');
      await member.save();
      const { pwd_h, ...res_u } = member.toObject();

      this.socketGateway.server.emit('user.update', res_u);
      this.socketGateway.server.emit('clan.update', clan.toObject());

      return {
        message: `${member.name} đã rời khỏi Bang Hội ${clan.meta.name}`,
      };
    } catch (err: any) {
      this.logger.log(
        `Err Remove Member: ${memberId} - ClanId: ${payload.clanId} - Msg: ${err.message}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async delClan(payload: DeleteClan) {
    const { ownerId } = payload;
    try {
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');
      let { clanId = null } = owner.meta;
      if (!clanId) throw new Error('Người dùng không tham gia Bang hội');

      if (clanId !== payload.clanId)
        throw new Error('Bạn không thể xóa Bang hội này');

      const clan = await this.clanModel.findById(payload.clanId);
      if (!clan) throw new Error('Bang hội không tồn tại');

      if (ownerId !== clan.ownerId)
        throw new Error('Bạn không phải là chủ Bang Hội');
      await this.clanModel.findByIdAndDelete(clanId);
      const members = await this.userService.findUsersWithOption({
        'meta.clanId': clanId,
      });
      const members_res = [];
      for (const member of members) {
        delete member.meta.clanId;
        delete member.meta.timeJoin;
        delete member.meta.score;

        member.markModified('meta');
        await member.save();
        const { pwd_h, ...res_u } = member.toObject();
        members_res.push(res_u);
      }
      this.socketGateway.server.emit('clan.update.remove', clanId);
      this.socketGateway.server.emit('user.update.bulk', members_res);
      return { message: 'Bạn đã xóa thành công Bang Hội' };
    } catch (err: any) {
      this.logger.log(`Err Del Clan: ${payload.clanId} - Msg: ${err.message}`);
      this.CutomHexception(err.message);
    }
  }

  async tranferClan(payload: TranferClan) {
    const { new_ownerId, ownerId } = payload;
    try {
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner.meta.clanId) throw new Error('Bạn không tham gia Bang hội');
      const n_owner = await this.userService.findUserOption({
        _id: new_ownerId,
      });
      if (!n_owner) throw new Error('Người dùng không tồn tại');
      if (n_owner.meta.clanId)
        throw new Error('Đối phương đã tham gia một Bang hội');
      const clan = await this.clanModel.findById(payload.clanId);
      if (ownerId !== clan.ownerId)
        throw new Error('Bạn không phải chủ Bang hội');

      // Add info clan of new owner;
      n_owner.meta = {
        ...n_owner.meta,
        clanId: clan.id,
        timeJoin: new Date(),
        score: 0,
      };

      // Change new owner of clan
      clan.ownerId = n_owner.id;
      clan.member += 1;

      // save all
      owner.markModified('meta');
      await owner.save();

      n_owner.markModified('meta');
      await n_owner.save();

      clan.markModified('meta');
      await clan.save();
      // Send Update;
      const members = [owner.toObject(), n_owner.toObject()].map((m) => {
        delete m.pwd_h;
        return m;
      });
      this.socketGateway.server.emit('clan.update', clan.toObject());
      this.socketGateway.server.emit('user.update.bulk', members);
      return { message: 'Bạn đã nhượng quyền sở hữu thành công' };
    } catch (err: any) {
      this.logger.log(
        `Err Tranfer Clan: ${payload.clanId} - Msg: ${err.message}`,
      );
      this.CutomHexception(err.message);
    }
  }

  //TODO ———————————————[Invite Zone]———————————————
  async createInviteClan(payload: CreateInviteClan) {
    const { uid } = payload;
    try {
      const member = await this.userService.findUserOption({ _id: uid });
      if (!member) throw new Error('Người dùng không tồn tại');
      let { clanId = null } = member.meta;
      if (clanId) throw new Error('Bạn đã gia nhập một Bang hội');
      const invite = await this.inviteClanModel.findOneAndUpdate(
        { uid: uid },
        {
          clanId: payload.clanId,
          meta: { ...(member.meta ?? {}), name: member.name },
        },
        { new: true, upsert: true },
      );
      this.socketGateway.server.emit('invite.update', invite.toObject());
      return { message: 'Bạn đã gửi lời tham gia thành công' };
    } catch (err: any) {
      this.logger.log(
        `Err Send Intive Clan: ${payload.uid} - Msg: ${err.message}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async Listinvite(clanId: string, ownerId: string) {
    try {
      const member = await this.userService.findUserOption({ _id: ownerId });
      if (!member) throw new Error('Người dùng không tồn tại');
      let { clanId = null } = member.meta;
      if (!clanId) throw new Error('Bạn không tham gia bang hội');

      const clan = await this.clanModel.findById(clanId);
      if (ownerId !== clan.ownerId)
        throw new Error('Bạn không phải chủ Bang hội');

      const invites = await this.inviteClanModel.find({ clanId: clanId });
      return { message: 'Dữ liệu đã được nhận', invites: invites };
    } catch (err: any) {
      this.logger.log(`Err List Intive Clan: ${clanId} - Msg: ${err.message}`);
      this.CutomHexception(err.message);
    }
  }

  async acpectClan(payload: AcpectClan) {
    try {
      const { ownerId, inviteId } = payload;
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');
      const invite = await this.inviteClanModel.findById(inviteId);
      if (!invite) throw new Error('Đơn xin gia nhập không tồn tại');
      let { clanId = null } = owner.meta;
      if (!clanId) throw new Error('Bạn không có ở trong một Bang hội');
      const clan = await this.clanModel.findById(clanId);
      if (clanId !== invite.clanId)
        throw new Error(
          'Bạn không thể chấp nhận đơn xin gia nhập của Bang Hội khác',
        );
      if (ownerId !== clan.ownerId)
        throw new Error('Bạn không phải là Chủ Bang Hội');
      const member = await this.userService.findUserOption({ _id: invite.uid });
      if (!member) throw new Error('Người dùng không tồn tại');
      if (member.meta.clanId)
        throw new Error('Người dùng đã tham gia một Bang Hội khác');

      // save data user
      member.meta = {
        ...(member.meta ?? {}),
        clanId: clan.id,
        timeJoin: new Date(),
        score: 0,
      };
      member.markModified('meta');
      await member.save();

      // save data clan
      clan.member += 1;
      clan.markModified('meta');
      await clan.save();

      // delete initve
      await this.inviteClanModel.findByIdAndDelete(inviteId);

      const { pwd_h, ...res_u } = member.toObject();

      this.socketGateway.server.emit('user.update', res_u);
      this.socketGateway.server.emit('clan.update', clan.toObject());
      this.socketGateway.server.emit('invite.remove', inviteId);
      return { message: `Bạn đã thêm thành công ${member.name} vào bang hội` };
    } catch (err: any) {
      this.logger.log(
        `Err Acpect Clan: ${payload.inviteId} - Msg: ${err.message}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async removeInviteClan(payload: RemoveInviteClan) {
    const { inviteId, ownerId } = payload;
    try {
      const owner = await this.userService.findUserOption({ _id: ownerId });
      if (!owner) throw new Error('Người dùng không tồn tại');
      let { clanId = null } = owner.meta;
      if (!clanId) throw new Error('Bạn không có ở trong một Bang Hội');
      const invite = await this.inviteClanModel.findById(inviteId);
      if (!invite) throw new Error('Đơn gia nhập không tồn tại');
      if (clanId !== invite.clanId)
        throw new Error('Bạn không thể xóa đơn gia nhập của Bang hội khác');
      const clan = await this.clanModel.findById(clanId);
      if (ownerId !== clan.ownerId)
        throw new Error('Bạn không phải là Chủ Bang hội');
      // Delete Invite
      await this.inviteClanModel.findByIdAndUpdate(inviteId);
      this.socketGateway.server.emit('invite.remove', inviteId);
      return { message: 'Bạn đã xóa đơn xin gia nhập' };
    } catch (err: any) {
      this.logger.log(
        `Err Remove Invite: ${payload.inviteId} - Msg: ${err.message}`,
      );
      this.CutomHexception(err.message);
    }
  }

  async removeInviteClanWithMemberId(memberId: string) {
    try {
      await this.inviteClanModel.deleteMany({ uid: memberId });
      this.socketGateway.server.emit('invite.update.member', memberId);
    } catch (err: any) {
      this.logger.log(`Err Remove Invite with MemberId: ${memberId}`);
      this.CutomHexception(err.message);
    }
  }

  //TODO ———————————————[Zone Exception]———————————————
  CutomHexception(msg) {
    throw new HttpException(
      { message: msg, code: 400 },
      HttpStatus.BAD_REQUEST,
    );
  }
}
