import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { RewardType } from '../enums/reward-type.enum';

export type RewardDocument = HydratedDocument<Reward>;

@Schema({ timestamps: true })
export class Reward extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Event', index: true })
  eventId: Types.ObjectId;

  @Prop({ required: true, enum: RewardType })
  type: RewardType;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  quantity: number; // Could represent points amount, item count, or number of coupons available

  // createdAt and updatedAt are added by { timestamps: true }
}

export const RewardSchema = SchemaFactory.createForClass(Reward); 