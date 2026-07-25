import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  parseResponse,
  ZodValidationPipe,
} from '../common/zod-validation.pipe';
import { objectIdSchema } from '../contracts/common';
import {
  blockResponseSchema,
  createReportInputSchema,
  reportResponseSchema,
} from '../contracts/moderation';
import type { UserDocument } from '../database/models';
import { ModerationService } from './moderation.service';

const userParamsSchema = z.strictObject({ userId: objectIdSchema });

@Controller()
@UseGuards(AuthGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reports')
  async report(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(createReportInputSchema))
    input: z.infer<typeof createReportInputSchema>,
  ) {
    return parseResponse(
      reportResponseSchema,
      await this.moderation.report(user, input),
    );
  }

  @Post('blocks/:userId')
  async block(
    @CurrentUser() user: UserDocument,
    @Param(new ZodValidationPipe(userParamsSchema))
    { userId }: z.infer<typeof userParamsSchema>,
  ) {
    return parseResponse(
      blockResponseSchema,
      await this.moderation.block(user, userId),
    );
  }

  @Delete('blocks/:userId')
  @HttpCode(200)
  async unblock(
    @CurrentUser() user: UserDocument,
    @Param(new ZodValidationPipe(userParamsSchema))
    { userId }: z.infer<typeof userParamsSchema>,
  ) {
    return parseResponse(
      blockResponseSchema,
      await this.moderation.unblock(user, userId),
    );
  }
}
