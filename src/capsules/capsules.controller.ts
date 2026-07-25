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
  capsuleResponseSchema,
  capsulesResponseSchema,
  createCapsuleInputSchema,
} from '../contracts/content';
import { CapsulesService } from './capsules.service';

@Controller('capsules')
@UseGuards(AuthGuard)
export class CapsulesController {
  constructor(private readonly capsules: CapsulesService) {}

  @Get()
  async list(@CurrentUser() user: UserDocument) {
    return parseResponse(capsulesResponseSchema, {
      capsules: await this.capsules.list(user),
    });
  }

  @Post()
  async create(
    @CurrentUser() user: UserDocument,
    @Body(new ZodValidationPipe(createCapsuleInputSchema))
    input: z.infer<typeof createCapsuleInputSchema>,
  ) {
    return parseResponse(capsuleResponseSchema, {
      capsule: await this.capsules.create(user, input),
    });
  }
}
