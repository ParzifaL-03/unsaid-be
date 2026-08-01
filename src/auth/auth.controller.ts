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
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiError } from '../common/api-error';
import {
  AliasDataDto,
  apiEnvelopeSchema,
  SessionDataDto,
  SignOutDataDto,
} from '../common/swagger.dto';
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
@ApiTags('Auth')
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

  private frontendCallbackUrl(error?: string) {
    const url = new URL(
      '/auth/callback',
      this.config.get('FRONTEND_URL', { infer: true }),
    );
    if (error) url.searchParams.set('error', error);
    return url.toString();
  }

  @Get('auth/google')
  @ApiOperation({ summary: 'Start Google OAuth login' })
  @ApiFoundResponse({ description: 'Redirects to Google OAuth.' })
  google(@Res() response: Response) {
    const google = this.googleConfig();
    if (!google) {
      response.redirect(this.frontendCallbackUrl('missing-google-config'));
      return;
    }
    const { state, codeChallenge, cookieValue } = this.auth.createOauthState();
    const redirectUri = `${this.config.get('API_URL', { infer: true })}/api/auth/google/callback`;
    const authorizationUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    authorizationUrl.searchParams.set('client_id', google.clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email profile');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('prompt', 'select_account');
    this.auth.setOauthStateCookie(response, cookieValue);
    response.redirect(authorizationUrl.toString());
  }

  @Get('auth/google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiFoundResponse({ description: 'Redirects back to the frontend.' })
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const fail = (reason: string) => {
      this.auth.clearOauthStateCookie(response);
      response.redirect(this.frontendCallbackUrl(reason));
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
    if (
      !code ||
      !state ||
      !savedState?.codeVerifier ||
      savedState.state !== state
    ) {
      fail('invalid-google-state');
      return;
    }
    this.auth.clearOauthStateCookie(response);

    const redirectUri = `${this.config.get('API_URL', { infer: true })}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: google.clientId,
        client_secret: google.clientSecret,
        code,
        code_verifier: savedState.codeVerifier,
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
    this.auth.setAuthCookies(response, user._id.toString());
    response.redirect(this.frontendCallbackUrl());
  }

  @Get('auth/session')
  @ApiOperation({ summary: 'Get the current anonymous account session' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ schema: apiEnvelopeSchema(SessionDataDto) })
  @ApiUnauthorizedResponse({ description: 'No active session.' })
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.getSession(request);
    response.setHeader('Cache-Control', 'private, no-store');
    if (!session) {
      throw new ApiError(
        401,
        'AUTH_REQUIRED',
        'A Google session is required for this action.',
      );
    }

    return parseResponse(sessionResponseSchema, {
      account: session.account,
    });
  }

  @Post('auth/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access and refresh JWT cookies' })
  @ApiCookieAuth('unsaid-refresh')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ schema: apiEnvelopeSchema(SessionDataDto) })
  @ApiUnauthorizedResponse({ description: 'No active refresh token.' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.refreshSession(request, response);
    response.setHeader('Cache-Control', 'private, no-store');
    if (!session) {
      throw new ApiError(
        401,
        'REFRESH_REQUIRED',
        'A valid refresh token is required for this action.',
      );
    }

    return parseResponse(sessionResponseSchema, {
      account: session.account,
    });
  }

  @Post('auth/sign-out')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign out and clear the session cookie' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ schema: apiEnvelopeSchema(SignOutDataDto) })
  signOut(@Res({ passthrough: true }) response: Response) {
    this.auth.revokeSession(response);
    return parseResponse(signOutResponseSchema, { ok: true });
  }

  @Post('me/alias')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Rotate the current user alias' })
  @ApiCookieAuth('unsaid-access')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ schema: apiEnvelopeSchema(AliasDataDto) })
  async rotateAlias(@CurrentUser() user: UserDocument) {
    const updated = await this.auth.rotateAlias(user);
    if (!updated) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
    return parseResponse(aliasResponseSchema, {
      account: this.auth.toAuthAccount(updated),
    });
  }
}
