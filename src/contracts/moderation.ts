import { z } from 'zod';
import { objectIdSchema } from './common';

export const createReportInputSchema = z.strictObject({
  targetType: z.enum(['user', 'post', 'reply', 'letter']),
  targetId: objectIdSchema,
  reason: z.enum([
    'harassment',
    'hate',
    'self_harm',
    'privacy',
    'spam',
    'other',
  ]),
  note: z.string().trim().max(800).optional(),
});
export const reportResponseSchema = z.strictObject({
  id: objectIdSchema,
  status: z.literal('open'),
});
export const blockResponseSchema = z.strictObject({ blocked: z.boolean() });
