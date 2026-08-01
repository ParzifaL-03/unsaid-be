import 'dotenv/config';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/auth/schemas/user.schema';
import { Capsule, CapsuleSchema } from '../src/capsules/schemas/capsule.schema';
import { configureDnsServers } from '../src/config/dns';
import { envSchema } from '../src/config/env';
import { Letter, LetterSchema } from '../src/letters/schemas/letter.schema';
import { Block, BlockSchema } from '../src/moderation/schemas/block.schema';
import { Report, ReportSchema } from '../src/moderation/schemas/report.schema';
import { Post, PostSchema } from '../src/posts/schemas/post.schema';
import { Reaction, ReactionSchema } from '../src/posts/schemas/reaction.schema';
import { Reply, ReplySchema } from '../src/posts/schemas/reply.schema';

const databaseModels = [
  mongoose.model(User.name, UserSchema),
  mongoose.model(Post.name, PostSchema),
  mongoose.model(Reply.name, ReplySchema),
  mongoose.model(Reaction.name, ReactionSchema),
  mongoose.model(Letter.name, LetterSchema),
  mongoose.model(Capsule.name, CapsuleSchema),
  mongoose.model(Report.name, ReportSchema),
  mongoose.model(Block.name, BlockSchema),
] as const;

async function main() {
  const env = envSchema.parse(process.env);
  configureDnsServers(env.MONGODB_DNS_SERVERS);

  await mongoose.connect(env.MONGODB_URI, { autoIndex: false });
  for (const databaseModel of databaseModels) {
    await databaseModel.syncIndexes();
    console.log(`Synced indexes for ${databaseModel.collection.name}`);
  }
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
