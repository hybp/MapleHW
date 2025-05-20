import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type UserReferralDocument = Document & UserReferral;

interface Referral {
  referredUserId: Types.ObjectId;
  referredAt: Date;
  status: 'PENDING' | 'COMPLETED';
}

@Schema({ timestamps: true })
export class UserReferral {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: [{
      referredUserId: { type: SchemaTypes.ObjectId, required: true },
      referredAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' }
    }],
    default: []
  })
  referrals: Referral[];
}

export const UserReferralSchema = SchemaFactory.createForClass(UserReferral); 