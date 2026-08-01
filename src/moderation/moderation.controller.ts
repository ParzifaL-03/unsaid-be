import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';
import {
  apiEnvelopeSchema,
  BlockDataDto,
  CreateReportDto,
  ReportDataDto,
} from '../common/swagger.dto';
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
import { ModerationService } from './moderation.service';

const userParamsSchema = z.object({ userId: objectIdSchema });

@Controller()
@UseGuards(AuthGuard)
@ApiTags('Moderation')
@ApiCookieAuth('unsaid-access')
@ApiBearerAuth('bearer')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('reports')
  @ApiOperation({ summary: 'Report a user, post, reply, or letter' })
  @ApiBody({ type: CreateReportDto })
  @ApiOkResponse({ schema: apiEnvelopeSchema(ReportDataDto) })
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
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({ name: 'userId', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(BlockDataDto) })
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
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(BlockDataDto) })
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
