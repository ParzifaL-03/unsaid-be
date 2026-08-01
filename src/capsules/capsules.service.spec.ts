import { Types } from 'mongoose';
import type { UserDocument } from '../auth/schemas/user.schema';
import { CapsulesService } from './capsules.service';
import type { CapsuleDocument } from './schemas/capsule.schema';

describe('CapsulesService publish', () => {
  const userId = new Types.ObjectId();
  const capsuleId = new Types.ObjectId();
  const postId = new Types.ObjectId();
  const user = {
    _id: userId,
    alias: 'quiet moon',
  } as UserDocument;

  let capsuleModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let postModel: {
    findOne: jest.Mock;
    create: jest.Mock;
  };
  let service: CapsulesService;

  const capsule = (overrides: Partial<CapsuleDocument> = {}): CapsuleDocument =>
    ({
      _id: capsuleId,
      authorId: userId,
      aliasSnapshot: 'quiet moon',
      body: 'A message for another day.',
      topic: 'future-me',
      mood: 'hopeful',
      visibility: 'public',
      unlockAt: new Date(Date.now() - 1000),
      status: 'unlocked',
      ...overrides,
    }) as CapsuleDocument;

  beforeEach(() => {
    capsuleModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    postModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    service = new CapsulesService(capsuleModel as never, postModel as never);
  });

  it('publishes an unlocked capsule as a post', async () => {
    const unlockedCapsule = capsule();
    capsuleModel.findOne.mockResolvedValue(unlockedCapsule);
    postModel.findOne.mockResolvedValue(null);
    postModel.create.mockResolvedValue({ _id: postId });
    capsuleModel.findOneAndUpdate.mockResolvedValue(
      capsule({ status: 'published', publishedPostId: postId }),
    );
    const publishedSetMatcher: unknown = expect.objectContaining({
      status: 'published',
      publishedPostId: postId,
    });

    const result = await service.publish(user, capsuleId.toString());

    expect(postModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: userId,
        aliasSnapshot: 'quiet moon',
        body: unlockedCapsule.body,
        topic: 'future-me',
        mood: 'hopeful',
        sourceCapsuleId: capsuleId,
      }),
    );
    expect(capsuleModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: capsuleId, authorId: userId }),
      expect.objectContaining({
        $set: publishedSetMatcher,
      }),
      { returnDocument: 'after' },
    );
    expect(result.status).toBe('published');
    expect(result.publishedPostId).toBe(postId.toString());
  });

  it('does not publish a locked capsule', async () => {
    capsuleModel.findOne.mockResolvedValue(
      capsule({
        status: 'sealed',
        unlockAt: new Date(Date.now() + 60_000),
      }),
    );

    await expect(
      service.publish(user, capsuleId.toString()),
    ).rejects.toMatchObject({ code: 'CAPSULE_LOCKED' });
    expect(postModel.create).not.toHaveBeenCalled();
    expect(capsuleModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
