import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, autoIndex: false, collection: 'users' })
export class User {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  })
  email!: string;

  @Prop({ type: Boolean, required: true, default: false })
  emailVerified!: boolean;

  @Prop({ type: String, required: true, trim: true, maxlength: 160 })
  googleAccountId!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 80,
  })
  alias!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  aliasChangedAt!: Date;

  @Prop({ type: String, trim: true, maxlength: 120 })
  name?: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  imageUrl?: string;

  @Prop({
    type: String,
    enum: ['user', 'moderator', 'admin'],
    required: true,
    default: 'user',
  })
  role!: 'user' | 'moderator' | 'admin';

  @Prop({
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    required: true,
    default: 'active',
  })
  status!: 'active' | 'suspended' | 'deleted';

  @Prop({ type: Date, required: true, default: Date.now })
  lastLoginAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleAccountId: 1 }, { unique: true });
UserSchema.index({ status: 1, createdAt: -1 });
UserSchema.index({ alias: 1 });
