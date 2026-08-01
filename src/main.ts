import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { createApiResponse } from './common/api-response';
import {
  AliasDataDto,
  AnonymousPostDto,
  ApiErrorDataDto,
  ApiErrorDetailsDto,
  ApiErrorEnvelopeDto,
  ApiMetaDto,
  BlockDataDto,
  CapsuleDataDto,
  CapsuleDto,
  CapsulesDataDto,
  CreateCapsuleDto,
  CreateOpenLetterDto,
  CreatePostDto,
  CreateReplyDto,
  CreateReportDto,
  HealthDataDto,
  OpenLetterDataDto,
  OpenLetterDto,
  OpenLettersDataDto,
  PostDataDto,
  PostsDataDto,
  ReactionDataDto,
  ReactionDto,
  RepliesDataDto,
  ReplyDataDto,
  ReplyDto,
  ReportDataDto,
  SessionDataDto,
  SignOutDataDto,
} from './common/swagger.dto';
import type { AppEnv } from './config/env';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);
  app.use(cookieParser());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('UNSAID API')
    .setDescription(
      'NestJS API for anonymous posts, replies, open letters, and capsules.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Session token',
        description: 'Use an UNSAID session token for protected endpoints.',
      },
      'bearer',
    )
    .addCookieAuth('unsaid-session', {
      type: 'apiKey',
      in: 'cookie',
      description: 'Session cookie set by Google OAuth.',
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [
      AliasDataDto,
      AnonymousPostDto,
      ApiErrorDataDto,
      ApiErrorDetailsDto,
      ApiErrorEnvelopeDto,
      ApiMetaDto,
      BlockDataDto,
      CapsuleDataDto,
      CapsuleDto,
      CapsulesDataDto,
      CreateCapsuleDto,
      CreateOpenLetterDto,
      CreatePostDto,
      CreateReplyDto,
      CreateReportDto,
      HealthDataDto,
      OpenLetterDataDto,
      OpenLetterDto,
      OpenLettersDataDto,
      PostDataDto,
      PostsDataDto,
      ReactionDataDto,
      ReactionDto,
      RepliesDataDto,
      ReplyDataDto,
      ReplyDto,
      ReportDataDto,
      SessionDataDto,
      SignOutDataDto,
    ],
  });
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_URL', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  });
  const allowedOrigins = new Set(
    config
      .get('CORS_URL', { infer: true })
      .map((origin) => origin.replace(/\/$/, '')),
  );
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      next();
      return;
    }

    const origin = request.get('origin')?.replace(/\/$/, '');
    const fetchSite = request.get('sec-fetch-site');
    if (
      (origin && !allowedOrigins.has(origin)) ||
      (!origin && fetchSite === 'cross-site')
    ) {
      response.status(403).json(
        createApiResponse(
          {
            error: {
              code: 'ORIGIN_NOT_ALLOWED',
              message: 'Request origin is not allowed.',
            },
          },
          403,
          null,
          false,
        ),
      );
      return;
    }
    next();
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`UNSAID API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
