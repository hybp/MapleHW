import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { Role } from '../../auth/roles.enum';

export type UserDocument = HydratedDocument<User>;

// createdAt + updatedAt
@Schema({ timestamps: true })
export class User extends Document {


  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string; // Hashed

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, enum: Role, default: Role.USER })
  role: Role;


}

export const UserSchema = SchemaFactory.createForClass(User); 