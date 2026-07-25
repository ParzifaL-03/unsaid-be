import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ timestamps: true, autoIndex: false, collection: 'blocks' })
export class Block {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  blockerId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  blockedUserId!: Types.ObjectId;

  @Prop({ type: String, maxlength: 240 })
  reason?: string;
}

export type BlockDocument = HydratedDocument<Block>;
export const BlockSchema = SchemaFactory.createForClass(Block);

BlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });
