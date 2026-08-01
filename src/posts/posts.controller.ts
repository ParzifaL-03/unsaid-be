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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';
import {
  apiEnvelopeSchema,
  CreatePostDto,
  CreateReplyDto,
  PostDataDto,
  PostsDataDto,
  ReactionDataDto,
  ReactionDto,
  RepliesDataDto,
  ReplyDataDto,
} from '../common/swagger.dto';
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
@ApiTags('Posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List published anonymous posts' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'cursor',
    required: false,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'mood',
    required: false,
    enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'],
  })
  @ApiQuery({ name: 'topic', required: false, example: 'starting-over' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(PostsDataDto, true) })
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
  @ApiOperation({ summary: 'Create an anonymous post' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiBody({ type: CreatePostDto })
  @ApiOkResponse({ schema: apiEnvelopeSchema(PostDataDto) })
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
  @ApiOperation({ summary: 'Get one published anonymous post' })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(PostDataDto) })
  async get(
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
  ) {
    return parseResponse(postResponseSchema, {
      post: await this.posts.get(id),
    });
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'List public replies for a post' })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(RepliesDataDto) })
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
  @ApiOperation({ summary: 'Create a reply for a post' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: CreateReplyDto })
  @ApiOkResponse({ schema: apiEnvelopeSchema(ReplyDataDto) })
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
  @ApiOperation({ summary: 'Add an echo reaction to a post' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  @ApiBody({ type: ReactionDto })
  @ApiOkResponse({ schema: apiEnvelopeSchema(ReactionDataDto) })
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
  @ApiOperation({ summary: 'Remove an echo reaction from a post' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(ReactionDataDto) })
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
