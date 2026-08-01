import { z } from 'zod';
import { objectIdSchema } from './common';

export const createReportInputSchema = z.object({
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
export const reportResponseSchema = z.object({
  id: objectIdSchema,
  status: z.literal('open'),
});
export const blockResponseSchema = z.object({ blocked: z.boolean() });
