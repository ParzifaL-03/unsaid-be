import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac } from 'node:crypto';
import type { Model } from 'mongoose';
import type { z } from 'zod';
import { User, type UserDocument } from '../auth/schemas/user.schema';
import type { AppEnv } from '../config/env';
import type { createOpenLetterInputSchema } from '../contracts/content';
import { Letter, type LetterDocument } from './schemas/letter.schema';

@Injectable()
export class LettersService {
  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    @InjectModel(Letter.name) private readonly letterModel: Model<Letter>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  private emailHash(email: string) {
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(email.toLowerCase())
      .digest('hex');
  }

  private mapLetter(letter: LetterDocument) {
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
    const letters = await this.letterModel
      .find({
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
    const recipient = await this.userModel.findOne({ email: recipientEmail });
    const letter = await this.letterModel.create({
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
