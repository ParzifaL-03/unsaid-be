import { Controller, Get } from '@nestjs/common';
import mongoose from 'mongoose';
import { z } from 'zod';
import { parseResponse } from '../common/zod-validation.pipe';

const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  database: z.literal('connected'),
  latencyMs: z.number().int().min(0),
});

@Controller('health')
export class HealthController {
  @Get('database')
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
