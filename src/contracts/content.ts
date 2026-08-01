import { z } from 'zod';
import { moodSchema, objectIdSchema, paginationSchema } from './common';

const topicSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^#/, ''))
  .pipe(
    z
      .string()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Use letters, numbers, and hyphens only.'),
  );

export const anonymousPostSchema = z.object({
  id: objectIdSchema,
  alias: z.string().min(3).max(80),
  body: z.string().min(12).max(1200),
  topic: z.string().min(1).max(60),
  mood: moodSchema,
  createdAt: z.string(),
  echoes: z.number().int().min(0),
  replies: z.number().int().min(0),
});
export const createPostInputSchema = z.object({
  body: z.string().trim().min(12).max(1200),
  topic: topicSchema.default('unsaid'),
  mood: moodSchema,
});
export const listPostsQuerySchema = paginationSchema.extend({
  mood: moodSchema.optional(),
  topic: topicSchema.optional(),
});
export const postsResponseSchema = z.object({
  posts: z.array(anonymousPostSchema),
  nextCursor: objectIdSchema.nullable(),
});
export const postResponseSchema = z.object({ post: anonymousPostSchema });

export const replySchema = z.object({
  id: objectIdSchema,
  postId: objectIdSchema,
  alias: z.string().min(3).max(80),
  body: z.string().min(2).max(1200),
  visibility: z.enum(['public', 'private']),
  createdAt: z.string(),
});
export const createReplyInputSchema = z.object({
  body: z.string().trim().min(2).max(1200),
  visibility: z.enum(['public', 'private']).default('public'),
});
export const repliesResponseSchema = z.object({
  replies: z.array(replySchema),
});
export const replyResponseSchema = z.object({ reply: replySchema });
export const reactionInputSchema = z.object({
  type: z.literal('echo').default('echo'),
});
export const reactionResponseSchema = z.object({
  active: z.boolean(),
  count: z.number().int().min(0),
});

export const openLetterSchema = z.object({
  id: objectIdSchema,
  recipientLabel: z.string().min(1).max(80),
  subject: z.string().min(4).max(80),
  body: z.string().min(20).max(2000),
  senderAlias: z.string().min(3).max(80),
  visibility: z.enum(['public', 'recipient_only']),
  createdAt: z.string(),
});
export const createOpenLetterInputSchema = z.object({
  recipientEmail: z.email(),
  recipientLabel: z.string().trim().min(1).max(80).default('someone'),
  subject: z.string().trim().min(4).max(80),
  body: z.string().trim().min(20).max(2000),
  visibility: z.enum(['public', 'recipient_only']).default('public'),
});
export const openLettersResponseSchema = z.object({
  letters: z.array(openLetterSchema),
});
export const openLetterResponseSchema = z.object({
  letter: openLetterSchema,
});

export const capsuleSchema = z.object({
  id: objectIdSchema,
  alias: z.string().min(3).max(80),
  body: z.string().min(12).max(2000),
  topic: z.string().min(1).max(60),
  mood: moodSchema.optional(),
  visibility: z.enum(['private', 'public', 'collective']),
  unlockAt: z.string(),
  status: z.enum(['sealed', 'unlocked', 'published']),
});
export const createCapsuleInputSchema = z.object({
  body: z.string().trim().min(12).max(2000),
  topic: topicSchema,
  mood: moodSchema.optional(),
  visibility: z.enum(['private', 'public', 'collective']).default('private'),
  unlockAt: z.coerce.date().refine((date) => date.getTime() > Date.now(), {
    message: 'Unlock date must be in the future.',
  }),
});
export const capsulesResponseSchema = z.object({
  capsules: z.array(capsuleSchema),
});
export const capsuleResponseSchema = z.object({
  capsule: capsuleSchema,
});

export type AnonymousPost = z.infer<typeof anonymousPostSchema>;
export type Reply = z.infer<typeof replySchema>;
export type OpenLetter = z.infer<typeof openLetterSchema>;
export type Capsule = z.infer<typeof capsuleSchema>;
