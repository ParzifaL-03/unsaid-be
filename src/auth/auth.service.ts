import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import { z } from 'zod';
import type { AppEnv } from '../config/env';
import type { AuthAccount } from '../contracts/auth';
import { Session } from './schemas/session.schema';
import { User, type UserDocument } from './schemas/user.schema';

export const SESSION_COOKIE = 'unsaid-session';
export const OAUTH_STATE_COOKIE = 'unsaid-oauth-state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export const googleUserInfoSchema = z.strictObject({
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean().optional(),
  name: z.string().max(120).optional(),
  picture: z.url().optional(),
});

const aliasAdjectives = ['quiet', 'paper', 'soft', 'north', 'golden'];
const aliasNouns = ['comet', 'moon', 'thunder', 'window', 'static'];
const aliases = aliasAdjectives.flatMap((adjective) =>
  aliasNouns.map((noun) => `${adjective} ${noun}`),
);

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  private base64Url(input: Buffer | string) {
    return Buffer.from(input).toString('base64url');
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private sign(value: string) {
    return this.base64Url(
      createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
        .update(value)
        .digest(),
    );
  }

  private encodeSignedJson(value: unknown) {
    const payload = this.base64Url(JSON.stringify(value));
    return `${payload}.${this.sign(payload)}`;
  }

  private decodeSignedJson<T>(value: string): T | null {
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;
    const expected = this.sign(payload);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      return JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as T;
    } catch {
      return null;
    }
  }

  private aliasFromEmail(email: string) {
    const hash = createHash('sha256').update(email.toLowerCase()).digest();
    return `${aliasAdjectives[hash[0] % aliasAdjectives.length]} ${
      aliasNouns[hash[1] % aliasNouns.length]
    }`;
  }

  private cookieOptions(expires?: Date) {
    const sameSite = this.config.get('COOKIE_SAME_SITE', { infer: true });
    return {
      httpOnly: true,
      secure:
        this.config.get('NODE_ENV', { infer: true }) === 'production' ||
        sameSite === 'none',
      sameSite,
      path: '/api',
      expires,
    } as const;
  }

  toAuthAccount(user: UserDocument): AuthAccount {
    return {
      userId: user._id.toString(),
      alias: user.alias,
      email: user.email,
      provider: 'google',
      name: user.name ?? undefined,
      image: user.imageUrl ?? undefined,
    };
  }

  createOauthState() {
    const state = this.base64Url(randomBytes(32));
    return { state, cookieValue: this.encodeSignedJson({ state }) };
  }

  readOauthState(value?: string) {
    if (!value) return null;
    return this.decodeSignedJson<{ state: string }>(value);
  }

  setOauthStateCookie(response: Response, value: string) {
    response.cookie(OAUTH_STATE_COOKIE, value, {
      ...this.cookieOptions(),
      maxAge: STATE_MAX_AGE_MS,
    });
  }

  setSessionCookie(
    response: Response,
    session: { token: string; expiresAt: Date },
  ) {
    response.cookie(
      SESSION_COOKIE,
      session.token,
      this.cookieOptions(session.expiresAt),
    );
  }

  clearAuthCookies(response: Response) {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
    response.clearCookie(OAUTH_STATE_COOKIE, this.cookieOptions());
  }

  async upsertGoogleUser(input: z.infer<typeof googleUserInfoSchema>) {
    const email = input.email.toLowerCase();
    return this.userModel.findOneAndUpdate(
      { googleAccountId: input.sub },
      {
        $set: {
          email,
          emailVerified: input.email_verified ?? true,
          name: input.name,
          imageUrl: input.picture,
          status: 'active',
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          googleAccountId: input.sub,
          alias: this.aliasFromEmail(email),
          aliasChangedAt: new Date(),
          role: 'user',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  async rotateAlias(user: UserDocument) {
    const currentIndex = aliases.indexOf(user.alias);
    const alias = aliases[(currentIndex + 1 + aliases.length) % aliases.length];
    return this.userModel.findByIdAndUpdate(
      user._id,
      { $set: { alias, aliasChangedAt: new Date() } },
      { new: true },
    );
  }

  async createDatabaseSession(request: Request, userId: string) {
    const token = this.base64Url(randomBytes(32));
    const expiresAt = new Date(
      Date.now() +
        this.config.get('SESSION_MAX_AGE_DAYS', { infer: true }) *
          24 *
          60 *
          60 *
          1000,
    );
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor?.split(',')[0] ?? request.ip);

    await this.sessionModel.create({
      userId,
      tokenHash: this.hashToken(token),
      expiresAt,
      lastUsedAt: new Date(),
      userAgent: request.get('user-agent')?.slice(0, 500),
      ipHash: ip
        ? createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
            .update(ip.trim())
            .digest('hex')
        : undefined,
    });
    return { token, expiresAt };
  }

  async getSession(request: Request) {
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) return null;

    const session = await this.sessionModel.findOne({
      tokenHash: this.hashToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return null;

    const user = await this.userModel.findOne({
      _id: session.userId,
      status: 'active',
    });
    if (!user) return null;

    if (Date.now() - session.lastUsedAt.getTime() > 60 * 60 * 1000) {
      await this.sessionModel.updateOne(
        { _id: session._id },
        { $set: { lastUsedAt: new Date() } },
      );
    }
    return { user, account: this.toAuthAccount(user) };
  }

  async revokeSession(request: Request) {
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) {
      await this.sessionModel.deleteOne({ tokenHash: this.hashToken(token) });
    }
  }
}
