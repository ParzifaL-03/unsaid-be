import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Post } from '../../posts/schemas/post.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'capsules' })
export class Capsule {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  authorId!: Types.ObjectId;

  @Prop({ type: String, required: true, minlength: 3, maxlength: 80 })
  aliasSnapshot!: string;

  @Prop({ type: String, required: true, minlength: 12, maxlength: 2000 })
  body!: string;

  @Prop({ type: String, required: true, minlength: 1, maxlength: 60 })
  topic!: string;

  @Prop({ type: String, enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'] })
  mood?: 'heavy' | 'hopeful' | 'nostalgic' | 'quiet';

  @Prop({
    type: String,
    enum: ['private', 'public', 'collective'],
    required: true,
    default: 'private',
  })
  visibility!: 'private' | 'public' | 'collective';

  @Prop({ type: Date, required: true })
  unlockAt!: Date;

  @Prop({ type: Date })
  unlockedAt?: Date;

  @Prop({
    type: String,
    enum: ['sealed', 'unlocked', 'published', 'deleted'],
    required: true,
    default: 'sealed',
  })
  status!: 'sealed' | 'unlocked' | 'published' | 'deleted';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Post.name })
  publishedPostId?: Types.ObjectId;
}

export type CapsuleDocument = HydratedDocument<Capsule>;
export const CapsuleSchema = SchemaFactory.createForClass(Capsule);

CapsuleSchema.index({ authorId: 1, unlockAt: 1 });
CapsuleSchema.index({ status: 1, unlockAt: 1 });
CapsuleSchema.index({ visibility: 1, status: 1, unlockAt: 1 });
