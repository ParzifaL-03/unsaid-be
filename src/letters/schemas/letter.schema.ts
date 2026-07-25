import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'letters' })
export class Letter {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  senderId!: Types.ObjectId;

  @Prop({ type: String, required: true, minlength: 3, maxlength: 80 })
  aliasSnapshot!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  recipientUserId?: Types.ObjectId;

  @Prop({ type: String, maxlength: 64 })
  recipientEmailHash?: string;

  @Prop({ type: String, required: true, minlength: 1, maxlength: 80 })
  recipientLabel!: string;

  @Prop({ type: String, required: true, minlength: 4, maxlength: 80 })
  subject!: string;

  @Prop({ type: String, required: true, minlength: 20, maxlength: 2000 })
  body!: string;

  @Prop({
    type: String,
    enum: ['public', 'recipient_only'],
    required: true,
    default: 'public',
  })
  visibility!: 'public' | 'recipient_only';

  @Prop({
    type: String,
    enum: ['sent', 'read', 'hidden', 'deleted'],
    required: true,
    default: 'sent',
  })
  status!: 'sent' | 'read' | 'hidden' | 'deleted';

  @Prop({ type: Date, required: true, default: Date.now })
  sentAt!: Date;

  @Prop({ type: Date })
  readAt?: Date;
}

export type LetterDocument = HydratedDocument<Letter>;
export const LetterSchema = SchemaFactory.createForClass(Letter);

LetterSchema.index({ recipientUserId: 1, sentAt: -1 });
LetterSchema.index({ recipientEmailHash: 1, sentAt: -1 });
LetterSchema.index({ senderId: 1, sentAt: -1 });
LetterSchema.index({ visibility: 1, status: 1, sentAt: -1 });
