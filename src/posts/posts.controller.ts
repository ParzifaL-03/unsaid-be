import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';
import {
  parseResponse,
  ZodValidationPipe,
} from '../common/zod-validation.pipe';
import { objectIdSchema } from '../contracts/common';
import {
  createPostInputSchema,
  createReplyInputSchema,
  listPostsQuerySchema,
  postResponseSchema,
  postsResponseSchema,
  reactionInputSchema,
  reactionResponseSchema,
  repliesResponseSchema,
  replyResponseSchema,
} from '../contracts/content';
import { PostsService } from './posts.service';

const idParamsSchema = z.object({ id: objectIdSchema });

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listPostsQuerySchema))
    query: z.infer<typeof listPostsQuerySchema>,
  ) {
    const { data, meta } = await this.posts.list(query);
    return {
      data: parseResponse(postsResponseSchema, data),
      meta,
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(createPostInputSchema))
    input: z.infer<typeof createPostInputSchema>,
  ) {
    return parseResponse(postResponseSchema, {
      post: await this.posts.create(user, input),
    });
  }

  @Get(':id')
  async get(
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
  ) {
    return parseResponse(postResponseSchema, {
      post: await this.posts.get(id),
    });
  }

  @Get(':id/replies')
  async listReplies(
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
  ) {
    return parseResponse(repliesResponseSchema, {
      replies: await this.posts.listReplies(id),
    });
  }

  @Post(':id/replies')
  @UseGuards(AuthGuard)
  async createReply(
    @CurrentUser() user: UserDocument,
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
    @Body(new ZodValidationPipe(createReplyInputSchema))
    input: z.infer<typeof createReplyInputSchema>,
  ) {
    return parseResponse(replyResponseSchema, {
      reply: await this.posts.createReply(user, id, input),
    });
  }

  @Post(':id/reactions')
  @UseGuards(AuthGuard)
  async addReaction(
    @CurrentUser() user: UserDocument,
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
    @Body(new ZodValidationPipe(reactionInputSchema))
    input: z.infer<typeof reactionInputSchema>,
  ) {
    void input;
    return parseResponse(
      reactionResponseSchema,
      await this.posts.addEcho(user, id),
    );
  }

  @Delete(':id/reactions')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async removeReaction(
    @CurrentUser() user: UserDocument,
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
  ) {
    return parseResponse(
      reactionResponseSchema,
      await this.posts.removeEcho(user, id),
    );
  }
}
