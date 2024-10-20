import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type InviteClanDocument = HydratedDocument<InviteClan>;

@Schema({
  timestamps: true,
})
export class InviteClan {
  @Prop()
  uid: string;

  @Prop()
  clanId: string;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  meta: Record<string, any>;

  updatedAt?: Date;
  createdAt?: Date;
}

export const InviteClanSchema = SchemaFactory.createForClass(InviteClan);
