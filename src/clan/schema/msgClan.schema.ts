import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ClanMessageDocument = HydratedDocument<ClanMessage>;

@Schema({
  timestamps: true,
})
export class ClanMessage {
  @Prop()
  uid: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  meta: Record<string, any>;

  @Prop()
  content: string;

  @Prop()
  clanId: string;

  updatedAt?: Date;
  createdAt?: Date;
}

export const ClanMessageSchema = SchemaFactory.createForClass(ClanMessage);
