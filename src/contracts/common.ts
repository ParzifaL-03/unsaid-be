import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid resource id.');

export const moodSchema = z.enum(['heavy', 'hopeful', 'nostalgic', 'quiet']);

export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export const paginationSchema = z.strictObject({
  cursor: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type Mood = z.infer<typeof moodSchema>;
