import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { ApiExceptionFilter } from './common/api-exception.filter';
import type { AppEnv } from './config/env';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
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
      response.status(403).json({
        error: {
          code: 'ORIGIN_NOT_ALLOWED',
          message: 'Request origin is not allowed.',
        },
      });
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
