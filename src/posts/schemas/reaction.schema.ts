import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'reactions' })
export class Reaction {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, enum: ['post', 'reply'], required: true })
  targetType!: 'post' | 'reply';

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: ['echo'], required: true })
  type!: 'echo';
}

export type ReactionDocument = HydratedDocument<Reaction>;
export const ReactionSchema = SchemaFactory.createForClass(Reaction);

ReactionSchema.index(
  { targetType: 1, targetId: 1, userId: 1, type: 1 },
  { unique: true },
);
ReactionSchema.index({ userId: 1, createdAt: -1 });
