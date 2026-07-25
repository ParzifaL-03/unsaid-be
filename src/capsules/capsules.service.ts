import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { z } from 'zod';
import type { UserDocument } from '../auth/schemas/user.schema';
import type { createCapsuleInputSchema } from '../contracts/content';
import { Capsule, type CapsuleDocument } from './schemas/capsule.schema';

@Injectable()
export class CapsulesService {
  constructor(
    @InjectModel(Capsule.name) private readonly capsuleModel: Model<Capsule>,
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
    };
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
}
