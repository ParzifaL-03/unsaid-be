import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose';

const schemaOptions = { timestamps: true, autoIndex: false } as const;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    emailVerified: { type: Boolean, required: true, default: false },
    googleAccountId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    alias: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    aliasChangedAt: { type: Date, required: true, default: Date.now },
    name: { type: String, trim: true, maxlength: 120 },
    imageUrl: { type: String, trim: true, maxlength: 1000 },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      required: true,
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      required: true,
      default: 'active',
    },
    lastLoginAt: { type: Date, required: true, default: Date.now },
  },
  { ...schemaOptions, collection: 'users' },
);
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleAccountId: 1 }, { unique: true });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ alias: 1 });

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true, default: Date.now },
    userAgent: { type: String, maxlength: 500 },
    ipHash: { type: String, maxlength: 64 },
  },
  { ...schemaOptions, collection: 'sessions' },
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, createdAt: -1 });

const postSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aliasSnapshot: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 80,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 12,
      maxlength: 1200,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    mood: {
      type: String,
      enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'],
      required: true,
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted'],
      required: true,
      default: 'published',
    },
    publishedAt: { type: Date, required: true, default: Date.now },
    echoCount: { type: Number, required: true, min: 0, default: 0 },
    replyCount: { type: Number, required: true, min: 0, default: 0 },
    deletedAt: { type: Date },
  },
  { ...schemaOptions, collection: 'posts' },
);
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ topic: 1, publishedAt: -1 });
postSchema.index({ mood: 1, publishedAt: -1 });
postSchema.index({ authorId: 1, publishedAt: -1 });

const replySchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aliasSnapshot: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 80,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 1200,
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      required: true,
      default: 'public',
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'deleted'],
      required: true,
      default: 'published',
    },
    deletedAt: { type: Date },
  },
  { ...schemaOptions, collection: 'replies' },
);
replySchema.index({ postId: 1, status: 1, createdAt: 1 });
replySchema.index({ authorId: 1, createdAt: -1 });

const reactionSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: ['post', 'reply'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['echo'], required: true },
  },
  { ...schemaOptions, collection: 'reactions' },
);
reactionSchema.index(
  { targetType: 1, targetId: 1, userId: 1, type: 1 },
  { unique: true },
);
reactionSchema.index({ userId: 1, createdAt: -1 });

const letterSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aliasSnapshot: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 80,
    },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientEmailHash: { type: String, maxlength: 64 },
    recipientLabel: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 80,
    },
    subject: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 80,
    },
    body: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 2000,
    },
    visibility: {
      type: String,
      enum: ['public', 'recipient_only'],
      required: true,
      default: 'public',
    },
    status: {
      type: String,
      enum: ['sent', 'read', 'hidden', 'deleted'],
      required: true,
      default: 'sent',
    },
    sentAt: { type: Date, required: true, default: Date.now },
    readAt: { type: Date },
  },
  { ...schemaOptions, collection: 'letters' },
);
letterSchema.index({ recipientUserId: 1, sentAt: -1 });
letterSchema.index({ recipientEmailHash: 1, sentAt: -1 });
letterSchema.index({ senderId: 1, sentAt: -1 });
letterSchema.index({ visibility: 1, status: 1, sentAt: -1 });

const capsuleSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aliasSnapshot: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 80,
    },
    body: {
      type: String,
      required: true,
      minlength: 12,
      maxlength: 2000,
    },
    topic: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 60,
    },
    mood: {
      type: String,
      enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'],
    },
    visibility: {
      type: String,
      enum: ['private', 'public', 'collective'],
      required: true,
      default: 'private',
    },
    unlockAt: { type: Date, required: true },
    unlockedAt: { type: Date },
    status: {
      type: String,
      enum: ['sealed', 'unlocked', 'published', 'deleted'],
      required: true,
      default: 'sealed',
    },
    publishedPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
  },
  { ...schemaOptions, collection: 'capsules' },
);
capsuleSchema.index({ authorId: 1, unlockAt: 1 });
capsuleSchema.index({ status: 1, unlockAt: 1 });
capsuleSchema.index({ visibility: 1, status: 1, unlockAt: 1 });

const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['user', 'post', 'reply', 'letter'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: ['harassment', 'hate', 'self_harm', 'privacy', 'spam', 'other'],
      required: true,
    },
    note: { type: String, maxlength: 800 },
    status: {
      type: String,
      enum: ['open', 'reviewing', 'resolved', 'dismissed'],
      required: true,
      default: 'open',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { ...schemaOptions, collection: 'reports' },
);
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });

const blockSchema = new Schema(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blockedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: { type: String, maxlength: 240 },
  },
  { ...schemaOptions, collection: 'blocks' },
);
blockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

type User = InferSchemaType<typeof userSchema>;
type Session = InferSchemaType<typeof sessionSchema>;
type Post = InferSchemaType<typeof postSchema>;
type Reply = InferSchemaType<typeof replySchema>;
type Reaction = InferSchemaType<typeof reactionSchema>;
type Letter = InferSchemaType<typeof letterSchema>;
type Capsule = InferSchemaType<typeof capsuleSchema>;
type Report = InferSchemaType<typeof reportSchema>;
type Block = InferSchemaType<typeof blockSchema>;

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema);
export const SessionModel =
  (models.Session as Model<Session> | undefined) ??
  model<Session>('Session', sessionSchema);
export const PostModel =
  (models.Post as Model<Post> | undefined) ?? model<Post>('Post', postSchema);
export const ReplyModel =
  (models.Reply as Model<Reply> | undefined) ??
  model<Reply>('Reply', replySchema);
export const ReactionModel =
  (models.Reaction as Model<Reaction> | undefined) ??
  model<Reaction>('Reaction', reactionSchema);
export const LetterModel =
  (models.Letter as Model<Letter> | undefined) ??
  model<Letter>('Letter', letterSchema);
export const CapsuleModel =
  (models.Capsule as Model<Capsule> | undefined) ??
  model<Capsule>('Capsule', capsuleSchema);
export const ReportModel =
  (models.Report as Model<Report> | undefined) ??
  model<Report>('Report', reportSchema);
export const BlockModel =
  (models.Block as Model<Block> | undefined) ??
  model<Block>('Block', blockSchema);

export type UserDocument = InstanceType<typeof UserModel>;
export const databaseModels = [
  UserModel,
  SessionModel,
  PostModel,
  ReplyModel,
  ReactionModel,
  LetterModel,
  CapsuleModel,
  ReportModel,
  BlockModel,
] as const;
