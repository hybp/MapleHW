import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type UserActivityDocument = Document & UserActivity;

@Schema({ timestamps: true })
export class UserActivity {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  loginStreak: number;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date;

  @Prop({ type: [Date], default: [] })
  loginHistory: Date[];
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivity); 