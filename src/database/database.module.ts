import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { configureDnsServers } from '../config/dns';
import type { AppEnv } from '../config/env';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => {
        mongoose.set('bufferCommands', false);
        configureDnsServers(config.get('MONGODB_DNS_SERVERS', { infer: true }));

        return {
          uri: config.get('MONGODB_URI', { infer: true }),
          maxPoolSize: 10,
          minPoolSize: 1,
          serverSelectionTimeoutMS: 5_000,
          autoIndex: false,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
