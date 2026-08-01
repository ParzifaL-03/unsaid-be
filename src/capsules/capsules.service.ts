import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { z } from 'zod';
import type { UserDocument } from '../auth/schemas/user.schema';
import { ApiError } from '../common/api-error';
import type { createCapsuleInputSchema } from '../contracts/content';
import { Post } from '../posts/schemas/post.schema';
import { Capsule, type CapsuleDocument } from './schemas/capsule.schema';

@Injectable()
export class CapsulesService {
  constructor(
    @InjectModel(Capsule.name) private readonly capsuleModel: Model<Capsule>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  private mapCapsule(capsule: CapsuleDocument) {
    return {
      id: capsule._id.toString(),
      alias: capsule.aliasSnapshot,
      body: capsule.body,
      topic: capsule.topic,
      mood: capsule.mood ?? undefined,
      visibility: capsule.visibility,
      unlockAt: capsule.unlockAt.toISOString(),
      status: capsule.status as 'sealed' | 'unlocked' | 'published',
      publishedPostId: capsule.publishedPostId?.toString(),
    };
  }

  private async getOwnedCapsule(user: UserDocument, capsuleId: string) {
    const capsule = await this.capsuleModel.findOne({
      _id: capsuleId,
      authorId: user._id,
      status: { $ne: 'deleted' },
    });
    if (!capsule) {
      throw new ApiError(404, 'CAPSULE_NOT_FOUND', 'Capsule was not found.');
    }
    return capsule;
  }

  async list(user: UserDocument) {
    const now = new Date();
    await this.capsuleModel.updateMany(
      { authorId: user._id, status: 'sealed', unlockAt: { $lte: now } },
      { $set: { status: 'unlocked', unlockedAt: now } },
    );
    const capsules = await this.capsuleModel
      .find({
        authorId: user._id,
        status: { $ne: 'deleted' },
      })
      .sort({ unlockAt: 1 });
    return capsules.map((capsule) => this.mapCapsule(capsule));
  }

  async create(
    user: UserDocument,
    input: z.infer<typeof createCapsuleInputSchema>,
  ) {
    const capsule = await this.capsuleModel.create({
      authorId: user._id,
      aliasSnapshot: user.alias,
      body: input.body,
      topic: input.topic,
      mood: input.mood,
      visibility: input.visibility,
      unlockAt: input.unlockAt,
    });
    return this.mapCapsule(capsule);
  }

  async publish(user: UserDocument, capsuleId: string) {
    const capsule = await this.getOwnedCapsule(user, capsuleId);
    if (capsule.status === 'published') return this.mapCapsule(capsule);

    const now = new Date();
    if (capsule.unlockAt.getTime() > now.getTime()) {
      throw new ApiError(
        409,
        'CAPSULE_LOCKED',
        'Capsule cannot be published before its unlock date.',
      );
    }
    if (capsule.visibility === 'private') {
      throw new ApiError(
        409,
        'CAPSULE_PRIVATE',
        'Private capsules cannot be published.',
      );
    }
    if (capsule.body.length > 1200) {
      throw new ApiError(
        409,
        'CAPSULE_TOO_LONG_TO_PUBLISH',
        'Capsule body must be 1200 characters or fewer to publish as a post.',
      );
    }

    const existingPost = await this.postModel.findOne({
      sourceCapsuleId: capsule._id,
    });
    const post =
      existingPost ??
      (await this.postModel.create({
        authorId: user._id,
        aliasSnapshot: capsule.aliasSnapshot,
        body: capsule.body,
        topic: capsule.topic,
        mood: capsule.mood ?? 'quiet',
        publishedAt: now,
        sourceCapsuleId: capsule._id,
      }));

    const updated = await this.capsuleModel.findOneAndUpdate(
      {
        _id: capsule._id,
        authorId: user._id,
        status: { $ne: 'deleted' },
      },
      {
        $set: {
          status: 'published',
          unlockedAt: capsule.unlockedAt ?? now,
          publishedPostId: post._id,
        },
      },
      { returnDocument: 'after' },
    );

    return this.mapCapsule(updated ?? capsule);
  }
}
