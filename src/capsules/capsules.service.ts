import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { createCapsuleInputSchema } from '../contracts/content';
import { CapsuleModel, type UserDocument } from '../database/models';

@Injectable()
export class CapsulesService {
  private mapCapsule(capsule: InstanceType<typeof CapsuleModel>) {
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
    await CapsuleModel.updateMany(
      { authorId: user._id, status: 'sealed', unlockAt: { $lte: now } },
      { $set: { status: 'unlocked', unlockedAt: now } },
    );
    const capsules = await CapsuleModel.find({
      authorId: user._id,
      status: { $ne: 'deleted' },
    }).sort({ unlockAt: 1 });
    return capsules.map((capsule) => this.mapCapsule(capsule));
  }

  async create(
    user: UserDocument,
    input: z.infer<typeof createCapsuleInputSchema>,
  ) {
    const capsule = await CapsuleModel.create({
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
