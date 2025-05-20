import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { RewardRequestStatus } from '../enums/reward-request-status.enum';

export type RewardRequestDocument = HydratedDocument<RewardRequest>;

@Schema({ timestamps: { createdAt: 'requestDate', updatedAt: true } }) // Using requestDate for createdAt
export class RewardRequest extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Event', index: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Reward' })
  rewardId: Types.ObjectId;

  @Prop({
    required: true,
    enum: RewardRequestStatus,
    default: RewardRequestStatus.PENDING,
    index: true
  })
  status: RewardRequestStatus;

  // requestDate is handled by timestamps option { createdAt: 'requestDate' }
  // Mongoose will automatically manage `requestDate` as the creation timestamp
  requestDate: Date;

  @Prop({ type: Date })
  processDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId; // User who processed (approved/rejected)

  @Prop()
  notes?: string;

  @Prop({ type: Date, required: false })
  distributedAt?: Date;

  @Prop({ type: String, required: false })
  distributionDetails?: string; // E.g., transaction ID, coupon code

  // updatedAt is added by { timestamps: true }
}

export const RewardRequestSchema = SchemaFactory.createForClass(RewardRequest);

// Compound index to prevent duplicate requests by the same user for the same reward (or event, depending on logic)
RewardRequestSchema.index({ userId: 1, eventId: 1, rewardId: 1 }, { unique: true }); 