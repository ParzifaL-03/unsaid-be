import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { z } from 'zod';
import type { UserDocument } from '../auth/schemas/user.schema';
import { ApiError } from '../common/api-error';
import type { createReportInputSchema } from '../contracts/moderation';
import { Block } from './schemas/block.schema';
import { Report } from './schemas/report.schema';

@Injectable()
export class ModerationService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Block.name) private readonly blockModel: Model<Block>,
  ) {}

  async report(
    user: UserDocument,
    input: z.infer<typeof createReportInputSchema>,
  ) {
    const report = await this.reportModel.create({
      reporterId: user._id,
      ...input,
    });
    return { id: report._id.toString(), status: 'open' as const };
  }

  async block(user: UserDocument, blockedUserId: string) {
    if (user._id.toString() === blockedUserId) {
      throw new ApiError(
        409,
        'SELF_BLOCK',
        'You cannot block your own account.',
      );
    }
    await this.blockModel.updateOne(
      { blockerId: user._id, blockedUserId },
      { $setOnInsert: { blockerId: user._id, blockedUserId } },
      { upsert: true },
    );
    return { blocked: true };
  }

  async unblock(user: UserDocument, blockedUserId: string) {
    await this.blockModel.deleteOne({
      blockerId: user._id,
      blockedUserId,
    });
    return { blocked: false };
  }
}
