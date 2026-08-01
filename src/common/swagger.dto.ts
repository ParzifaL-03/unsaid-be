import type { Type } from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  totalPage!: number;

  @ApiProperty({ example: 98 })
  totalData!: number;
}

export class ApiErrorDetailsDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Request data is invalid.' })
  message!: string;

  @ApiPropertyOptional({
    example: { body: ['String must contain at least 12 character(s)'] },
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  fields?: Record<string, string[]>;
}

export class ApiErrorDataDto {
  @ApiProperty({ type: ApiErrorDetailsDto })
  error!: ApiErrorDetailsDto;
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({ example: false })
  status!: boolean;

  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({ type: ApiErrorDataDto })
  data!: ApiErrorDataDto;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: false,
    example: null,
  })
  meta!: Record<string, never> | null;
}

export function apiEnvelopeSchema(dataType: Type<unknown>, meta = false) {
  return {
    allOf: [
      {
        properties: {
          status: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          data: { $ref: getSchemaPath(dataType) },
          meta: meta
            ? { $ref: getSchemaPath(ApiMetaDto) }
            : {
                type: 'object',
                nullable: true,
                additionalProperties: false,
                example: null,
              },
        },
      },
    ],
  };
}

export class AuthAccountDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  userId!: string;

  @ApiProperty({ example: 'quiet comet' })
  alias!: string;

  @ApiProperty({ example: 'person@example.com' })
  email!: string;

  @ApiProperty({ example: 'google' })
  provider!: 'google';

  @ApiPropertyOptional({ example: 'Person Name' })
  name?: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/a/example',
  })
  image?: string;
}

export class SessionDataDto {
  @ApiProperty({ type: () => AuthAccountDto, nullable: true })
  account!: AuthAccountDto | null;
}

export class AliasDataDto {
  @ApiProperty({ type: () => AuthAccountDto })
  account!: AuthAccountDto;
}

export class SignOutDataDto {
  @ApiProperty({ example: true })
  ok!: true;
}

export class CreatePostDto {
  @ApiProperty({
    minLength: 12,
    maxLength: 1200,
    example: 'I never said how much that goodbye changed me.',
  })
  body!: string;

  @ApiProperty({ maxLength: 60, example: 'starting-over' })
  topic!: string;

  @ApiProperty({ enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'] })
  mood!: 'heavy' | 'hopeful' | 'nostalgic' | 'quiet';
}

export class AnonymousPostDto extends CreatePostDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'quiet comet' })
  alias!: string;

  @ApiProperty({ example: 'just now' })
  createdAt!: string;

  @ApiProperty({ example: 12 })
  echoes!: number;

  @ApiProperty({ example: 3 })
  replies!: number;
}

export class PostsDataDto {
  @ApiProperty({ type: [AnonymousPostDto] })
  posts!: AnonymousPostDto[];

  @ApiProperty({ type: 'string', nullable: true, example: null })
  nextCursor!: string | null;
}

export class PostDataDto {
  @ApiProperty({ type: AnonymousPostDto })
  post!: AnonymousPostDto;
}

export class CreateReplyDto {
  @ApiProperty({ minLength: 2, maxLength: 1200, example: 'I hear you.' })
  body!: string;

  @ApiProperty({ enum: ['public', 'private'], default: 'public' })
  visibility!: 'public' | 'private';
}

export class ReplyDto extends CreateReplyDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  postId!: string;

  @ApiProperty({ example: 'paper moon' })
  alias!: string;

  @ApiProperty({ example: '2026-08-01T08:30:00.000Z' })
  createdAt!: string;
}

export class RepliesDataDto {
  @ApiProperty({ type: [ReplyDto] })
  replies!: ReplyDto[];
}

export class ReplyDataDto {
  @ApiProperty({ type: ReplyDto })
  reply!: ReplyDto;
}

export class ReactionDto {
  @ApiProperty({ enum: ['echo'], default: 'echo' })
  type!: 'echo';
}

export class ReactionDataDto {
  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: 13 })
  count!: number;
}

export class CreateOpenLetterDto {
  @ApiProperty({ example: 'recipient@example.com' })
  recipientEmail!: string;

  @ApiProperty({ example: 'old friend' })
  recipientLabel!: string;

  @ApiProperty({ minLength: 4, maxLength: 80, example: 'Words I kept' })
  subject!: string;

  @ApiProperty({
    minLength: 20,
    maxLength: 2000,
    example: 'I wanted to say this with more care than I had before.',
  })
  body!: string;

  @ApiProperty({ enum: ['public', 'recipient_only'], default: 'public' })
  visibility!: 'public' | 'recipient_only';
}

export class OpenLetterDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'old friend' })
  recipientLabel!: string;

  @ApiProperty({ example: 'Words I kept' })
  subject!: string;

  @ApiProperty({ example: 'I wanted to say this with more care.' })
  body!: string;

  @ApiProperty({ example: 'quiet comet' })
  senderAlias!: string;

  @ApiProperty({ enum: ['public', 'recipient_only'] })
  visibility!: 'public' | 'recipient_only';

  @ApiProperty({ example: '2026-08-01T08:30:00.000Z' })
  createdAt!: string;
}

export class OpenLettersDataDto {
  @ApiProperty({ type: [OpenLetterDto] })
  letters!: OpenLetterDto[];
}

export class OpenLetterDataDto {
  @ApiProperty({ type: OpenLetterDto })
  letter!: OpenLetterDto;
}

export class CreateCapsuleDto {
  @ApiProperty({
    minLength: 12,
    maxLength: 2000,
    example: 'Open this next year.',
  })
  body!: string;

  @ApiProperty({ example: 'future-me' })
  topic!: string;

  @ApiPropertyOptional({ enum: ['heavy', 'hopeful', 'nostalgic', 'quiet'] })
  mood?: 'heavy' | 'hopeful' | 'nostalgic' | 'quiet';

  @ApiProperty({
    enum: ['private', 'public', 'collective'],
    default: 'private',
  })
  visibility!: 'private' | 'public' | 'collective';

  @ApiProperty({ example: '2027-08-01T00:00:00.000Z' })
  unlockAt!: string;
}

export class CapsuleDto extends CreateCapsuleDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'quiet comet' })
  alias!: string;

  @ApiProperty({ enum: ['sealed', 'unlocked', 'published'] })
  status!: 'sealed' | 'unlocked' | 'published';
}

export class CapsulesDataDto {
  @ApiProperty({ type: [CapsuleDto] })
  capsules!: CapsuleDto[];
}

export class CapsuleDataDto {
  @ApiProperty({ type: CapsuleDto })
  capsule!: CapsuleDto;
}

export class CreateReportDto {
  @ApiProperty({ enum: ['user', 'post', 'reply', 'letter'] })
  targetType!: 'user' | 'post' | 'reply' | 'letter';

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  targetId!: string;

  @ApiProperty({
    enum: ['harassment', 'hate', 'self_harm', 'privacy', 'spam', 'other'],
  })
  reason!: 'harassment' | 'hate' | 'self_harm' | 'privacy' | 'spam' | 'other';

  @ApiPropertyOptional({ maxLength: 800, example: 'Contains private details.' })
  note?: string;
}

export class ReportDataDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'open' })
  status!: 'open';
}

export class BlockDataDto {
  @ApiProperty({ example: true })
  blocked!: boolean;
}

export class HealthDataDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'connected' })
  database!: 'connected';

  @ApiProperty({ example: 12 })
  latencyMs!: number;
}
