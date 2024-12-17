import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type GiftCodeDocument = HydratedDocument<GiftCode>;

@Schema({
  timestamps: true,
})
export class GiftCode {
  @Prop({ unique: true })
  code: string; // mã nhận thưởng

  @Prop({
    default: {
      winner: 1, // Tổng số lượng users có thể nhập mã
      prize: 0, // Phần thưởng
      type: 'moneny', // Loai phần thưởng 'money' | 'diamon' | 'VIP'
      isWinner: 0, // Tổng số lượng users đã nhận
      winnerList: [], // Danh sách users đã nhận
      // Update sau này!
    },
    type: SchemaTypes.Mixed,
  })
  meta: Record<string, any>;

  @Prop({ default: false })
  isStatus: boolean; // Đánh dấu mã kết thúc

  updatedAt?: Date;
  createdAt?: Date;
}

export const GiftCodeSchema = SchemaFactory.createForClass(GiftCode);
