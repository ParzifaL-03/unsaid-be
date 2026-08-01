import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'node:crypto';
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
  iat?: number;
  exp?: number;
};
type OauthStatePayload = {
  state: string;
  codeVerifier: string;
  type: 'oauth-state';
  iat?: number;
  exp?: number;
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
    private readonly jwtService: JwtService,
  ) {}

  private base64Url(input: Buffer | string) {
    return Buffer.from(input).toString('base64url');
  }

  private createJwt(userId: string, type: JwtTokenType, maxAgeSeconds: number) {
    return this.jwtService.sign({ sub: userId, type } satisfies JwtPayload, {
      expiresIn: maxAgeSeconds,
    });
  }

  private verifyJwt(token: string, expectedType: JwtTokenType) {
    try {
      const decoded = this.jwtService.verify<Partial<JwtPayload>>(token);
      if (
        typeof decoded.sub !== 'string' ||
        decoded.type !== expectedType ||
        typeof decoded.exp !== 'number'
      ) {
        return null;
      }

      return decoded as JwtPayload;
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
      cookieValue: this.jwtService.sign(
        {
          state,
          codeVerifier,
          type: 'oauth-state',
        } satisfies OauthStatePayload,
        { expiresIn: STATE_MAX_AGE_MS / 1000 },
      ),
    };
  }

  readOauthState(value?: string) {
    if (!value) return null;
    try {
      const payload = this.jwtService.verify<Partial<OauthStatePayload>>(value);
      if (
        payload.type !== 'oauth-state' ||
        typeof payload.state !== 'string' ||
        typeof payload.codeVerifier !== 'string' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }

      return { state: payload.state, codeVerifier: payload.codeVerifier };
    } catch {
      return null;
    }
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
