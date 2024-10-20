import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bot } from './schema/bot.schema';

@Injectable()
export class BotService {
  constructor(
    @InjectModel(Bot.name)
    private readonly botModel: Model<Bot>,
  ) {}

  async ListBot() {
    return this.botModel.find();
  }
}
