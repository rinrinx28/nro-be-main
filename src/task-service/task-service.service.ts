import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TaskServiceService {
  constructor(private emitEvent2: EventEmitter2) {}
  // Cron job: Executes at the 45th second of every minute
  @Cron('0 50 23 * * *', {
    name: 'turn.of.mini.game',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handlerTurnOfMiniGame() {
    this.emitEvent2.emitAsync('turn.of.mini.game', 'run');
  }

  @Cron('0 0 6 * * *', {
    name: 'turn.on.mini.game',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handlerTurnOnMiniGame() {
    this.emitEvent2.emitAsync('turn.on.mini.game', 'run');
  }

  @Cron('0 59 23 * * *', {
    name: 'turn.of.mini.game.24',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handlerTurnOfMiniGame24() {
    this.emitEvent2.emitAsync('turn.of.mini.game.24', 'run');
  }

  @Cron('0 2 0 * * *', {
    name: 'turn.on.mini.game.24',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handlerTurnOnMiniGame24() {
    this.emitEvent2.emitAsync('turn.on.mini.game.24', 'run');
  }

  @Cron('0 0 0 * * *', {
    name: 'top.clan',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handlerTopClan() {
    this.emitEvent2.emitAsync('top.clan', 'run');
  }

  @Cron('0 1 0 * * *', {
    name: 'top.user',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  handlerTopUser() {
    this.emitEvent2.emitAsync('top.user', 'run');
  }
}
