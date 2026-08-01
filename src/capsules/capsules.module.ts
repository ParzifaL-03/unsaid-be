import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { CapsulesController } from './capsules.controller';
import { CapsulesService } from './capsules.service';
import { Capsule, CapsuleSchema } from './schemas/capsule.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Capsule.name, schema: CapsuleSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [CapsulesController],
  providers: [CapsulesService],
})
export class CapsulesModule {}
