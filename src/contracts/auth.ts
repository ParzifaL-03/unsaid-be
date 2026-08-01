import { z } from 'zod';
import { objectIdSchema } from './common';

export const authAccountSchema = z.object({
  userId: objectIdSchema,
  alias: z.string().min(3).max(80),
  email: z.email(),
  provider: z.literal('google'),
  name: z.string().optional(),
  image: z.url().optional(),
});

export const sessionResponseSchema = z.object({
  account: authAccountSchema.nullable(),
});

export const signOutResponseSchema = z.object({ ok: z.literal(true) });
export const aliasResponseSchema = z.object({
  account: authAccountSchema,
});

export type AuthAccount = z.infer<typeof authAccountSchema>;
