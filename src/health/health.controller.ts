import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { z } from 'zod';
import { apiEnvelopeSchema, HealthDataDto } from '../common/swagger.dto';
import { parseResponse } from '../common/zod-validation.pipe';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('connected'),
  latencyMs: z.number().int().min(0),
});

@Controller('health')
@ApiTags('Health')
export class HealthController {
  @Get('database')
  @ApiOperation({ summary: 'Check database health' })
  @ApiOkResponse({ schema: apiEnvelopeSchema(HealthDataDto) })
  async database() {
    const startedAt = Date.now();
    await mongoose.connection.db?.admin().ping();
    return parseResponse(healthResponseSchema, {
      status: 'ok',
      database: 'connected',
      latencyMs: Date.now() - startedAt,
    });
  }
}
