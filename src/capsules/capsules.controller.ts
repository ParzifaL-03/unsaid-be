import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  CapsuleDataDto,
  CapsulesDataDto,
  CreateCapsuleDto,
} from '../common/swagger.dto';
import {
  parseResponse,
  ZodValidationPipe,
} from '../common/zod-validation.pipe';
import { objectIdSchema } from '../contracts/common';
import {
  capsuleResponseSchema,
  capsulesResponseSchema,
  createCapsuleInputSchema,
} from '../contracts/content';
import { CapsulesService } from './capsules.service';

const idParamsSchema = z.object({ id: objectIdSchema });

@Controller('capsules')
@UseGuards(AuthGuard)
@ApiTags('Capsules')
@ApiCookieAuth('unsaid-access')
@ApiBearerAuth('bearer')
export class CapsulesController {
  constructor(private readonly capsules: CapsulesService) {}

  @Get()
  @ApiOperation({ summary: 'List capsules for the current user' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(CapsulesDataDto) })
  async list(@CurrentUser() user: UserDocument) {
    return parseResponse(capsulesResponseSchema, {
      capsules: await this.capsules.list(user),
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a time capsule' })
  @ApiBody({ type: CreateCapsuleDto })
  @ApiOkResponse({ schema: apiEnvelopeSchema(CapsuleDataDto) })
  async create(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(createCapsuleInputSchema))
    input: z.infer<typeof createCapsuleInputSchema>,
  ) {
    return parseResponse(capsuleResponseSchema, {
      capsule: await this.capsules.create(user, input),
    });
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an unlocked capsule as an anonymous post' })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(CapsuleDataDto) })
  async publish(
    @CurrentUser() user: UserDocument,
    @Param(new ZodValidationPipe(idParamsSchema))
    { id }: z.infer<typeof idParamsSchema>,
  ) {
    return parseResponse(capsuleResponseSchema, {
      capsule: await this.capsules.publish(user, id),
    });
  }
}
