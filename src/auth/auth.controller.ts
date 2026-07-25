import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ApiError } from '../common/api-error';
import { parseResponse } from '../common/zod-validation.pipe';
import type { AppEnv } from '../config/env';
import {
  aliasResponseSchema,
  sessionResponseSchema,
  signOutResponseSchema,
} from '../contracts/auth';
import {
  AuthService,
  googleUserInfoSchema,
  OAUTH_STATE_COOKIE,
} from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { UserDocument } from './schemas/user.schema';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  private googleConfig() {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', {
      infer: true,
    });
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }

  @Get('auth/google')
  google(@Res() response: Response) {
    const google = this.googleConfig();
    if (!google) {
      response.redirect(
        `${this.config.get('FRONTEND_URL', { infer: true })}/?auth=missing-google-config`,
      );
      return;
    }
    const { state, cookieValue } = this.auth.createOauthState();
    const redirectUri = `${this.config.get('API_URL', { infer: true })}/api/auth/google/callback`;
    const authorizationUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    authorizationUrl.searchParams.set('client_id', google.clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email profile');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('prompt', 'select_account');
    this.auth.setOauthStateCookie(response, cookieValue);
    response.redirect(authorizationUrl.toString());
  }

  @Get('auth/google/callback')
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const fail = (reason: string) => {
      this.auth.clearAuthCookies(response);
      response.redirect(
        `${this.config.get('FRONTEND_URL', { infer: true })}/?auth=${reason}`,
      );
    };
    const google = this.googleConfig();
    if (!google) {
      fail('missing-google-config');
      return;
    }
    const code =
      typeof request.query.code === 'string' ? request.query.code : '';
    const state =
      typeof request.query.state === 'string' ? request.query.state : '';
    const savedState = this.auth.readOauthState(
      request.cookies?.[OAUTH_STATE_COOKIE] as string | undefined,
    );
    if (!code || !state || savedState?.state !== state) {
      fail('invalid-google-state');
      return;
    }

    const redirectUri = `${this.config.get('API_URL', { infer: true })}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: google.clientId,
        client_secret: google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) {
      fail('google-token-failed');
      return;
    }
    const token = (await tokenResponse.json()) as { access_token?: unknown };
    if (typeof token.access_token !== 'string') {
      fail('google-token-missing');
      return;
    }

    const userResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    if (!userResponse.ok) {
      fail('google-user-failed');
      return;
    }
    const userResult = googleUserInfoSchema.safeParse(
      await userResponse.json(),
    );
    if (!userResult.success || userResult.data.email_verified === false) {
      fail('google-email-unverified');
      return;
    }

    const user = await this.auth.upsertGoogleUser(userResult.data);
    const session = await this.auth.createDatabaseSession(
      request,
      user._id.toString(),
    );
    this.auth.clearAuthCookies(response);
    this.auth.setSessionCookie(response, session);
    response.redirect(this.config.get('FRONTEND_URL', { infer: true }));
  }

  @Get('auth/session')
  async session(@Req() request: Request) {
    const session = await this.auth.getSession(request);
    return parseResponse(sessionResponseSchema, {
      account: session?.account ?? null,
    });
  }

  @Post('auth/sign-out')
  @HttpCode(200)
  async signOut(@Req() request: Request, @Res() response: Response) {
    await this.auth.revokeSession(request);
    this.auth.clearAuthCookies(response);
    response.json(parseResponse(signOutResponseSchema, { ok: true }));
  }

  @Post('me/alias')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async rotateAlias(@CurrentUser() user: UserDocument) {
    const updated = await this.auth.rotateAlias(user);
    if (!updated) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
    return parseResponse(aliasResponseSchema, {
      account: this.auth.toAuthAccount(updated),
    });
  }
}
