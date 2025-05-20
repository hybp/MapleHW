import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { EventStatus } from '../enums/event-status.enum';
import { EventCondition } from '../enums/condition-type.enum';

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop([
    raw({
      type: { type: String, enum: EventCondition, required: true },
      target: { type: Number, required: true },
      details: { type: Object }, // Flexible for additional condition-specific data
    }),
  ])
  conditions: { type: EventCondition; target: number; details?: any }[];

  @Prop({ required: true, enum: EventStatus, default: EventStatus.INACTIVE })
  status: EventStatus;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' }) // Assuming 'User' collection name for user reference
  createdBy: Types.ObjectId; // This will store the User's _id

  // createdAt and updatedAt are added by { timestamps: true }
}

export const EventSchema = SchemaFactory.createForClass(Event); 