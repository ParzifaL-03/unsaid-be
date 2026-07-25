import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'posts' })
export class Post {
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

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 12,
    maxlength: 1200,
  })
  body!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 60,
  })
  topic!: string;

  @Prop({
    type: String,
    enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'],
    required: true,
  })
  mood!: 'heavy' | 'hopeful' | 'nostalgic' | 'quiet';

  @Prop({
    type: String,
    enum: ['published', 'hidden', 'deleted'],
    required: true,
    default: 'published',
  })
  status!: 'published' | 'hidden' | 'deleted';

  @Prop({ type: Date, required: true, default: Date.now })
  publishedAt!: Date;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  echoCount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  replyCount!: number;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export type PostDocument = HydratedDocument<Post>;
export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ topic: 1, publishedAt: -1 });
PostSchema.index({ mood: 1, publishedAt: -1 });
PostSchema.index({ authorId: 1, publishedAt: -1 });
