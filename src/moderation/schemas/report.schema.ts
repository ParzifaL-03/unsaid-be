import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'reports' })
export class Report {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  reporterId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['user', 'post', 'reply', 'letter'],
    required: true,
  })
  targetType!: 'user' | 'post' | 'reply' | 'letter';

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['harassment', 'hate', 'self_harm', 'privacy', 'spam', 'other'],
    required: true,
  })
  reason!: 'harassment' | 'hate' | 'self_harm' | 'privacy' | 'spam' | 'other';

  @Prop({ type: String, maxlength: 800 })
  note?: string;

  @Prop({
    type: String,
    enum: ['open', 'reviewing', 'resolved', 'dismissed'],
    required: true,
    default: 'open',
  })
  status!: 'open' | 'reviewing' | 'resolved' | 'dismissed';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;
}

export type ReportDocument = HydratedDocument<Report>;
export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
