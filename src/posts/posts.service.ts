import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { z } from 'zod';
import { ApiError } from '../common/api-error';
import type {
  createPostInputSchema,
  createReplyInputSchema,
  listPostsQuerySchema,
} from '../contracts/content';
import {
  PostModel,
  ReactionModel,
  ReplyModel,
  type UserDocument,
} from '../database/models';

@Injectable()
export class PostsService {
  private relativeTime(value: Date) {
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - value.getTime()) / 1000),
    );
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  private mapPost(post: InstanceType<typeof PostModel>) {
    return {
      id: post._id.toString(),
      alias: post.aliasSnapshot,
      body: post.body,
      topic: post.topic,
      mood: post.mood,
      createdAt: this.relativeTime(post.publishedAt),
      echoes: post.echoCount,
      replies: post.replyCount,
    };
  }

  private mapReply(reply: InstanceType<typeof ReplyModel>) {
    const createdAt = reply.get('createdAt');
    return {
      id: reply._id.toString(),
      postId: reply.postId.toString(),
      alias: reply.aliasSnapshot,
      body: reply.body,
      visibility: reply.visibility,
      createdAt: createdAt.toISOString(),
    };
  }

  async list(query: z.infer<typeof listPostsQuerySchema>) {
    const filter: Record<string, unknown> = { status: 'published' };
    if (query.cursor) filter._id = { $lt: new Types.ObjectId(query.cursor) };
    if (query.mood) filter.mood = query.mood;
    if (query.topic) filter.topic = query.topic;

    const posts = await PostModel.find(filter)
      .sort({ _id: -1 })
      .limit(query.limit + 1);
    const hasNextPage = posts.length > query.limit;
    const page = hasNextPage ? posts.slice(0, query.limit) : posts;
    return {
      posts: page.map((post) => this.mapPost(post)),
      nextCursor: hasNextPage ? page.at(-1)!._id.toString() : null,
    };
  }

  async get(postId: string) {
    const post = await PostModel.findOne({
      _id: postId,
      status: 'published',
    });
    if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post was not found.');
    return this.mapPost(post);
  }

  async create(
    user: UserDocument,
    input: z.infer<typeof createPostInputSchema>,
  ) {
    const post = await PostModel.create({
      authorId: user._id,
      aliasSnapshot: user.alias,
      body: input.body,
      topic: input.topic,
      mood: input.mood,
      publishedAt: new Date(),
    });
    return this.mapPost(post);
  }

  async listReplies(postId: string) {
    await this.get(postId);
    const replies = await ReplyModel.find({
      postId,
      status: 'published',
      visibility: 'public',
    }).sort({ createdAt: 1 });
    return replies.map((reply) => this.mapReply(reply));
  }

  async createReply(
    user: UserDocument,
    postId: string,
    input: z.infer<typeof createReplyInputSchema>,
  ) {
    const post = await PostModel.findOne({
      _id: postId,
      status: 'published',
    });
    if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post was not found.');

    const reply = await ReplyModel.create({
      postId: post._id,
      authorId: user._id,
      aliasSnapshot: user.alias,
      body: input.body,
      visibility: input.visibility,
    });
    await PostModel.updateOne({ _id: post._id }, { $inc: { replyCount: 1 } });
    return this.mapReply(reply);
  }

  async addEcho(user: UserDocument, postId: string) {
    const post = await PostModel.findOne({
      _id: postId,
      status: 'published',
    });
    if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post was not found.');

    try {
      await ReactionModel.create({
        targetType: 'post',
        targetId: post._id,
        userId: user._id,
        type: 'echo',
      });
      const updated = await PostModel.findByIdAndUpdate(
        post._id,
        { $inc: { echoCount: 1 } },
        { new: true },
      );
      return { active: true, count: updated?.echoCount ?? post.echoCount + 1 };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return { active: true, count: post.echoCount };
      }
      throw error;
    }
  }

  async removeEcho(user: UserDocument, postId: string) {
    const removed = await ReactionModel.deleteOne({
      targetType: 'post',
      targetId: postId,
      userId: user._id,
      type: 'echo',
    });
    const post =
      removed.deletedCount > 0
        ? await PostModel.findOneAndUpdate(
            { _id: postId, echoCount: { $gt: 0 } },
            { $inc: { echoCount: -1 } },
            { new: true },
          )
        : await PostModel.findById(postId);
    if (!post || post.status !== 'published') {
      throw new ApiError(404, 'POST_NOT_FOUND', 'Post was not found.');
    }
    return { active: false, count: post.echoCount };
  }
}
