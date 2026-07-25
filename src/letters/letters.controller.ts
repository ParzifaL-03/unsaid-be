import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';
import {
  parseResponse,
  ZodValidationPipe,
} from '../common/zod-validation.pipe';
import {
  createOpenLetterInputSchema,
  openLetterResponseSchema,
  openLettersResponseSchema,
} from '../contracts/content';
import { LettersService } from './letters.service';

@Controller('open-letters')
export class LettersController {
  constructor(private readonly letters: LettersService) {}

  @Get()
  async list() {
    return parseResponse(openLettersResponseSchema, {
      letters: await this.letters.listPublic(),
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(createOpenLetterInputSchema))
    input: z.infer<typeof createOpenLetterInputSchema>,
  ) {
    return parseResponse(openLetterResponseSchema, {
      letter: await this.letters.create(user, input),
    });
  }
}
