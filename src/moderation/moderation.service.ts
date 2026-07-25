import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { ApiError } from '../common/api-error';
import type { createReportInputSchema } from '../contracts/moderation';
import { BlockModel, ReportModel, type UserDocument } from '../database/models';

@Injectable()
export class ModerationService {
  async report(
    user: UserDocument,
    input: z.infer<typeof createReportInputSchema>,
  ) {
    const report = await ReportModel.create({
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
    await BlockModel.updateOne(
      { blockerId: user._id, blockedUserId },
      { $setOnInsert: { blockerId: user._id, blockedUserId } },
      { upsert: true },
    );
    return { blocked: true };
  }

  async unblock(user: UserDocument, blockedUserId: string) {
    await BlockModel.deleteOne({
      blockerId: user._id,
      blockedUserId,
    });
    return { blocked: false };
  }
}
