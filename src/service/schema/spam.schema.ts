import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, HydratedDocument, Types } from 'mongoose';

export type SpamDocument = HydratedDocument<Spam>;

@Schema({
  timestamps: true,
})
export class Spam {
  @Prop()
  uid: string;

  @Prop()
  serviceId: string;

  @Prop()
  reason: string;

  @Prop()
  server: string;

  updatedAt?: Date;
  createdAt?: Date;
}

export const SpamSchema = SchemaFactory.createForClass(Spam);
