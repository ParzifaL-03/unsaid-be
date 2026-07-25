import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';
import { Post } from './post.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'replies' })
export class Reply {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Post.name,
    required: true,
  })
  postId!: Types.ObjectId;

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
    minlength: 2,
    maxlength: 1200,
  })
  body!: string;

  @Prop({
    type: String,
    enum: ['public', 'private'],
    required: true,
    default: 'public',
  })
  visibility!: 'public' | 'private';

  @Prop({
    type: String,
    enum: ['published', 'hidden', 'deleted'],
    required: true,
    default: 'published',
  })
  status!: 'published' | 'hidden' | 'deleted';

  @Prop({ type: Date })
  deletedAt?: Date;
}

export type ReplyDocument = HydratedDocument<Reply>;
export const ReplySchema = SchemaFactory.createForClass(Reply);

ReplySchema.index({ postId: 1, status: 1, createdAt: 1 });
ReplySchema.index({ authorId: 1, createdAt: -1 });
