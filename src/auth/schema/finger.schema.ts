import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, HydratedDocument } from 'mongoose';

export type FingerPrintDocument = HydratedDocument<FingerPrint>;

@Schema({
  timestamps: true,
})
export class FingerPrint {
  @Prop({ unique: true })
  hash: string;

  @Prop({ default: [] })
  countAccount: string[];

  @Prop({ default: 0 })
  maxAccountInDay: number;

  updatedAt?: Date;
  createdAt?: Date;
}

export const FingerPrintSchema = SchemaFactory.createForClass(FingerPrint);
