import {
  createCapsuleInputSchema,
  createOpenLetterInputSchema,
  createPostInputSchema,
} from './content';

describe('API contracts', () => {
  it('normalizes a post topic and rejects unknown fields', () => {
    const valid = createPostInputSchema.parse({
      body: 'This is a valid anonymous expression.',
      topic: '#Starting-Over',
      mood: 'hopeful',
    });
    expect(valid.topic).toBe('starting-over');
    expect(
      createPostInputSchema.safeParse({
        ...valid,
        authorId: '507f1f77bcf86cd799439011',
      }).success,
    ).toBe(false);
  });

  it('validates letter recipient email', () => {
    expect(
      createOpenLetterInputSchema.safeParse({
        recipientEmail: 'not-an-email',
        recipientLabel: 'old friend',
        subject: 'Words I kept',
        body: 'This message is long enough to be accepted.',
      }).success,
    ).toBe(false);
  });

  it('requires a future capsule unlock date', () => {
    expect(
      createCapsuleInputSchema.safeParse({
        body: 'A message for another day.',
        topic: 'future-me',
        visibility: 'private',
        unlockAt: new Date(0).toISOString(),
      }).success,
    ).toBe(false);
  });
});
