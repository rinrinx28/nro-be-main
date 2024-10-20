import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClanService } from './clan.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  AcpectClan,
  CreateClan,
  CreateInviteClan,
  DeleteClan,
  RemoveInviteClan,
  TranferClan,
  UpdateClan,
} from './dto/dto.clan';

@Controller('clan')
@UseGuards(JwtAuthGuard)
export class ClanController {
  constructor(private readonly clanService: ClanService) {}

  //TODO ———————————————[Clan Zone]———————————————
  @Post('/create')
  async createClan(@Body() body: CreateClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.createClan({
      ...body,
      ownerId: user._id.toString(),
    });
  }

  @Post('/update')
  async updateClan(@Body() body: UpdateClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.updateClan({
      ...body,
      ownerId: user._id.toString(),
    });
  }

  @Post('/delete')
  async deleteClan(@Body() body: DeleteClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.delClan({
      ...body,
      ownerId: user._id.toString(),
    });
  }

  @Post('/tranfer')
  async tranferClan(@Body() body: TranferClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.tranferClan({
      ...body,
      ownerId: user._id.toString(),
    });
  }

  @Get('/list/msg/:clanId')
  async listMsg(@Req() req: any, @Param('clanId') clanId: string) {
    const user = req.user;
    return await this.clanService.listMessage(clanId, user._id.toString());
  }

  //TODO ———————————————[Invite Zone]———————————————

  @Post('/invite/create')
  async inviteCreate(@Body() body: CreateInviteClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.createInviteClan({
      ...body,
      uid: user._id.toString(),
    });
  }

  @Get('/invite/list/:clanId')
  async Listinvite(@Req() req: any, @Param('clanId') clanId: string) {
    const user = req.user;
    return await this.clanService.Listinvite(clanId, user._id.toString());
  }

  @Post('/invite/acpect')
  async inviteAcpect(@Body() body: AcpectClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.acpectClan({
      ...body,
      ownerId: user._id.toString(),
    });
  }

  @Post('/invite/remove')
  async inviteRemove(@Body() body: RemoveInviteClan, @Req() req: any) {
    const user = req.user;
    return await this.clanService.removeInviteClan({
      ...body,
      ownerId: user._id.toString(),
    });
  }
}
