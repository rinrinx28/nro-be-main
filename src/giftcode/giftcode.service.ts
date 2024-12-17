import { Injectable } from '@nestjs/common';
import { GiftCode } from './schema/giftcode.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class GiftcodeService {
  constructor(
    @InjectModel(GiftCode.name)
    private readonly GiftCodeModel: Model<GiftCode>,
  ) {}
}
