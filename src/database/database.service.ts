import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import type { AppEnv } from '../config/env';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  async onModuleInit() {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(this.config.get('MONGODB_URI', { infer: true }), {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5_000,
      autoIndex: false,
    });
    this.logger.log('MongoDB connection pool ready');
  }

  async onApplicationShutdown() {
    await mongoose.disconnect();
  }
}
