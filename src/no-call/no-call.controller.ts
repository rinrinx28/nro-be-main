import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { NoCallService } from './no-call.service';

@Controller('no-call')
export class NoCallController {
  constructor(private readonly noCallService: NoCallService) {}

  @Get('/list/clan')
  async listClan() {
    return await this.noCallService.listClans();
  }

  @Get('/rank/clan')
  async rankClan() {
    return await this.noCallService.rankClan();
  }

  @Get('/rank/user')
  async rankUser() {
    return await this.noCallService.rankUser();
  }

  @Get('/list/econfig')
  async listConfig() {
    return await this.noCallService.listEConfig();
  }

  @Get('/list/message')
  async listMessage(@Query('server') server: string) {
    return await this.noCallService.listMessage((server = '24'));
  }

  @Get('/list/clan/member/:clanId')
  async listClanMember(@Param('clanId') clanId: string) {
    return await this.noCallService.listClanMember(clanId);
  }

  @Get('/list/userbet')
  async listUserBet(
    @Query('server') server: string,
    @Query('limited') limited: string,
  ) {
    return await this.noCallService.listUserBet(server, limited);
  }

  @Get('/info/mini')
  async listMini(@Query('server') server: string) {
    return await this.noCallService.minigame((server = '24'));
  }
}
