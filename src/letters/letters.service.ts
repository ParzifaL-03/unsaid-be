import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { z } from 'zod';
import type { AppEnv } from '../config/env';
import type { createOpenLetterInputSchema } from '../contracts/content';
import { LetterModel, UserModel, type UserDocument } from '../database/models';

@Injectable()
export class LettersService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  private emailHash(email: string) {
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(email.toLowerCase())
      .digest('hex');
  }

  private mapLetter(letter: InstanceType<typeof LetterModel>) {
    return {
      id: letter._id.toString(),
      recipientLabel: letter.recipientLabel,
      subject: letter.subject,
      body: letter.body,
      senderAlias: letter.aliasSnapshot,
      visibility: letter.visibility,
      createdAt: letter.sentAt.toISOString(),
    };
  }

  async listPublic() {
    const letters = await LetterModel.find({
      visibility: 'public',
      status: { $in: ['sent', 'read'] },
    })
      .sort({ sentAt: -1 })
      .limit(50);
    return letters.map((letter) => this.mapLetter(letter));
  }

  async create(
    user: UserDocument,
    input: z.infer<typeof createOpenLetterInputSchema>,
  ) {
    const recipientEmail = input.recipientEmail.toLowerCase();
    const recipient = await UserModel.findOne({ email: recipientEmail });
    const letter = await LetterModel.create({
      senderId: user._id,
      aliasSnapshot: user.alias,
      recipientUserId: recipient?._id,
      recipientEmailHash: this.emailHash(recipientEmail),
      recipientLabel: input.recipientLabel,
      subject: input.subject,
      body: input.body,
      visibility: input.visibility,
      sentAt: new Date(),
    });
    return this.mapLetter(letter);
  }
}
