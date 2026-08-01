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
import { User, type UserDocument } from './schemas/user.schema';

export const ACCESS_TOKEN_COOKIE = 'unsaid-access';
export const REFRESH_TOKEN_COOKIE = 'unsaid-refresh';
export const OAUTH_STATE_COOKIE = 'unsaid-oauth-state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

type JwtTokenType = 'access' | 'refresh';
type JwtPayload = {
  sub: string;
  type: JwtTokenType;
  iat: number;
  exp: number;
};

export const googleUserInfoSchema = z.object({
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
  ) {}

  private base64Url(input: Buffer | string) {
    return Buffer.from(input).toString('base64url');
  }

  private sign(value: string) {
    return this.base64Url(
      createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
        .update(value)
        .digest(),
    );
  }

  private signJwt(payload: JwtPayload) {
    const header = this.base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const encodedPayload = this.base64Url(JSON.stringify(payload));
    const signature = this.sign(`${header}.${encodedPayload}`);
    return `${header}.${encodedPayload}.${signature}`;
  }

  private createJwt(userId: string, type: JwtTokenType, maxAgeSeconds: number) {
    const now = Math.floor(Date.now() / 1000);
    return this.signJwt({
      sub: userId,
      type,
      iat: now,
      exp: now + maxAgeSeconds,
    });
  }

  private verifyJwt(token: string, expectedType: JwtTokenType) {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    const expected = this.sign(`${header}.${payload}`);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Partial<JwtPayload>;
      const now = Math.floor(Date.now() / 1000);
      if (
        typeof decoded.sub !== 'string' ||
        decoded.type !== expectedType ||
        typeof decoded.exp !== 'number' ||
        decoded.exp <= now
      ) {
        return null;
      }

      return decoded as JwtPayload;
    } catch {
      return null;
    }
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

  private accessTokenMaxAgeSeconds() {
    return (
      this.config.get('ACCESS_TOKEN_MAX_AGE_MINUTES', { infer: true }) * 60
    );
  }

  private refreshTokenMaxAgeSeconds() {
    return (
      this.config.get('REFRESH_TOKEN_MAX_AGE_DAYS', { infer: true }) *
      24 *
      60 *
      60
    );
  }

  private tokenFromRequest(request: Request, cookieName: string) {
    const cookieToken = request.cookies?.[cookieName] as string | undefined;
    if (cookieToken) return cookieToken;

    if (cookieName !== ACCESS_TOKEN_COOKIE) return undefined;
    const authorization = request.get('authorization');
    const [scheme, token] = authorization?.split(/\s+/) ?? [];
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
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
    const codeVerifier = this.base64Url(randomBytes(32));
    const codeChallenge = this.base64Url(
      createHash('sha256').update(codeVerifier).digest(),
    );
    return {
      state,
      codeChallenge,
      cookieValue: this.encodeSignedJson({ state, codeVerifier }),
    };
  }

  readOauthState(value?: string) {
    if (!value) return null;
    return this.decodeSignedJson<{ state: string; codeVerifier: string }>(
      value,
    );
  }

  setOauthStateCookie(response: Response, value: string) {
    response.cookie(OAUTH_STATE_COOKIE, value, {
      ...this.cookieOptions(),
      maxAge: STATE_MAX_AGE_MS,
    });
  }

  setAuthCookies(response: Response, userId: string) {
    const accessTokenMaxAge = this.accessTokenMaxAgeSeconds();
    const refreshTokenMaxAge = this.refreshTokenMaxAgeSeconds();
    const now = Date.now();

    response.cookie(
      ACCESS_TOKEN_COOKIE,
      this.createJwt(userId, 'access', accessTokenMaxAge),
      this.cookieOptions(new Date(now + accessTokenMaxAge * 1000)),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      this.createJwt(userId, 'refresh', refreshTokenMaxAge),
      this.cookieOptions(new Date(now + refreshTokenMaxAge * 1000)),
    );
  }

  clearAuthCookies(response: Response) {
    response.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions());
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.cookieOptions());
    this.clearOauthStateCookie(response);
  }

  clearOauthStateCookie(response: Response) {
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
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
  }

  async rotateAlias(user: UserDocument) {
    const currentIndex = aliases.indexOf(user.alias);
    const alias = aliases[(currentIndex + 1 + aliases.length) % aliases.length];
    return this.userModel.findByIdAndUpdate(
      user._id,
      { $set: { alias, aliasChangedAt: new Date() } },
      { returnDocument: 'after' },
    );
  }

  async getSession(request: Request) {
    const token = this.tokenFromRequest(request, ACCESS_TOKEN_COOKIE);
    if (!token) return null;

    const payload = this.verifyJwt(token, 'access');
    if (!payload) return null;
    const user = await this.userModel.findOne({
      _id: payload.sub,
      status: 'active',
    });
    if (!user) return null;

    return { user, account: this.toAuthAccount(user) };
  }

  async refreshSession(request: Request, response: Response) {
    const token = this.tokenFromRequest(request, REFRESH_TOKEN_COOKIE);
    if (!token) return null;

    const payload = this.verifyJwt(token, 'refresh');
    if (!payload) return null;
    const user = await this.userModel.findOne({
      _id: payload.sub,
      status: 'active',
    });
    if (!user) return null;

    this.setAuthCookies(response, user._id.toString());
    return { user, account: this.toAuthAccount(user) };
  }

  revokeSession(response: Response) {
    this.clearAuthCookies(response);
  }
}
