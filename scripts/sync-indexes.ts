import 'dotenv/config';
import mongoose from 'mongoose';
import { envSchema } from '../src/config/env';
import { databaseModels } from '../src/database/models';

async function main() {
  const env = envSchema.parse(process.env);
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
