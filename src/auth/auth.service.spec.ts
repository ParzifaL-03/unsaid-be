import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import type { AppEnv } from '../config/env';
import {
  ACCESS_TOKEN_COOKIE,
  AuthService,
  REFRESH_TOKEN_COOKIE,
} from './auth.service';
import type { User, UserDocument } from './schemas/user.schema';

describe('AuthService JWT handling', () => {
  const secret = 'test-auth-secret';
  const values = {
    AUTH_SECRET: secret,
    NODE_ENV: 'test',
    COOKIE_SAME_SITE: 'lax',
    ACCESS_TOKEN_MAX_AGE_MINUTES: 15,
    REFRESH_TOKEN_MAX_AGE_DAYS: 30,
  } as const;

  let cookie: jest.Mock<void, [string, string, unknown]>;
  let findOne: jest.Mock;
  let jwtService: JwtService;
  let service: AuthService;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: keyof typeof values) => values[key]),
    } as unknown as ConfigService<AppEnv, true>;
    cookie = jest.fn<void, [string, string, unknown]>();
    findOne = jest.fn();
    jwtService = new JwtService({
      secret,
      signOptions: { algorithm: 'HS256' },
      verifyOptions: { algorithms: ['HS256'] },
    });
    service = new AuthService(
      config,
      { findOne } as unknown as Model<User>,
      jwtService,
    );
  });

  it('signs access and refresh tokens with JwtService', () => {
    const sign = jest.spyOn(jwtService, 'sign');

    service.setAuthCookies({ cookie } as unknown as Response, 'user-1');

    expect(sign).toHaveBeenNthCalledWith(
      1,
      { sub: 'user-1', type: 'access' },
      { expiresIn: 15 * 60 },
    );
    expect(sign).toHaveBeenNthCalledWith(
      2,
      { sub: 'user-1', type: 'refresh' },
      { expiresIn: 30 * 24 * 60 * 60 },
    );
    expect(cookie.mock.calls[0][0]).toBe(ACCESS_TOKEN_COOKIE);
    expect(cookie.mock.calls[1][0]).toBe(REFRESH_TOKEN_COOKIE);
  });

  it('verifies an access token with JwtService', async () => {
    const user = {
      _id: { toString: () => 'user-1' },
      alias: 'quiet moon',
      email: 'user@example.com',
    } as UserDocument;
    findOne.mockResolvedValue(user);
    const verify = jest.spyOn(jwtService, 'verify');
    service.setAuthCookies({ cookie } as unknown as Response, 'user-1');
    const accessToken = cookie.mock.calls[0][1];

    const session = await service.getSession({
      cookies: { [ACCESS_TOKEN_COOKIE]: accessToken },
    } as unknown as Request);

    expect(verify).toHaveBeenCalledWith(accessToken);
    expect(findOne).toHaveBeenCalledWith({ _id: 'user-1', status: 'active' });
    expect(session?.account.userId).toBe('user-1');
  });

  it('rejects a refresh token when an access token is expected', async () => {
    service.setAuthCookies({ cookie } as unknown as Response, 'user-1');
    const refreshToken = cookie.mock.calls[1][1];

    const session = await service.getSession({
      cookies: { [ACCESS_TOKEN_COOKIE]: refreshToken },
    } as unknown as Request);

    expect(session).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('accepts a refresh token from the bearer header', async () => {
    const user = {
      _id: { toString: () => 'user-1' },
      alias: 'quiet moon',
      email: 'user@example.com',
    } as UserDocument;
    findOne.mockResolvedValue(user);
    service.setAuthCookies({ cookie } as unknown as Response, 'user-1');
    const refreshToken = cookie.mock.calls[1][1];
    cookie.mockClear();

    const session = await service.refreshSession(
      {
        cookies: {},
        get: (name: string) =>
          name === 'authorization' ? `Bearer ${refreshToken}` : undefined,
      } as unknown as Request,
      { cookie } as unknown as Response,
    );

    expect(session?.account.userId).toBe('user-1');
    expect(cookie).toHaveBeenCalledTimes(2);
  });

  it('signs and verifies the OAuth state with JwtService', () => {
    const sign = jest.spyOn(jwtService, 'sign');
    const verify = jest.spyOn(jwtService, 'verify');

    const oauthState = service.createOauthState();
    const decoded = service.readOauthState(oauthState.cookieValue);

    expect(sign).toHaveBeenCalledWith(
      {
        state: oauthState.state,
        codeVerifier: decoded?.codeVerifier,
        type: 'oauth-state',
      },
      { expiresIn: 10 * 60 },
    );
    expect(verify).toHaveBeenCalledWith(oauthState.cookieValue);
    expect(decoded?.state).toBe(oauthState.state);
  });

  it('rejects a non-OAuth JWT as OAuth state', () => {
    const accessToken = jwtService.sign({ sub: 'user-1', type: 'access' });

    expect(service.readOauthState(accessToken)).toBeNull();
  });
});
