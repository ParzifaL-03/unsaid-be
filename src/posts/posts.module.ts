import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post, PostSchema } from './schemas/post.schema';
import { Reaction, ReactionSchema } from './schemas/reaction.schema';
import { Reply, ReplySchema } from './schemas/reply.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Reply.name, schema: ReplySchema },
      { name: Reaction.name, schema: ReactionSchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
