import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserDocument } from '../auth/schemas/user.schema';
import {
  apiEnvelopeSchema,
  CreateOpenLetterDto,
  OpenLetterDataDto,
  OpenLettersDataDto,
} from '../common/swagger.dto';
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
@ApiTags('Open Letters')
export class LettersController {
  constructor(private readonly letters: LettersService) {}

  @Get()
  @ApiOperation({ summary: 'List public open letters' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(OpenLettersDataDto) })
  async list() {
    return parseResponse(openLettersResponseSchema, {
      letters: await this.letters.listPublic(),
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create an anonymous open letter' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiBody({ type: CreateOpenLetterDto })
  @ApiOkResponse({ schema: apiEnvelopeSchema(OpenLetterDataDto) })
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
