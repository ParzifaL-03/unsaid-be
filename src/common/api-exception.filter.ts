import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiError } from './api-error';
import { createApiResponse } from './api-response';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (error instanceof ApiError) {
      const statusCode = error.getStatus();
      response.status(statusCode).json(
        createApiResponse(
          {
            error: {
              code: error.code,
              message: error.message,
              fields: error.fields,
            },
          },
          statusCode,
          null,
          false,
        ),
      );
      return;
    }

    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      response.status(statusCode).json(
        createApiResponse(
          {
            error: {
              code: 'HTTP_ERROR',
              message: error.message,
            },
          },
          statusCode,
          null,
          false,
        ),
      );
      return;
    }

    const databaseUnavailable =
      error instanceof Error &&
      ['MongooseServerSelectionError', 'MongoNetworkError'].includes(
        error.name,
      );

    this.logger.error(error);
    const statusCode = databaseUnavailable
      ? HttpStatus.SERVICE_UNAVAILABLE
      : HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(statusCode).json(
      createApiResponse(
        {
          error: {
            code: databaseUnavailable
              ? 'DATABASE_UNAVAILABLE'
              : 'INTERNAL_ERROR',
            message: databaseUnavailable
              ? 'The database is temporarily unavailable.'
              : 'An unexpected error occurred.',
          },
        },
        statusCode,
        null,
        false,
      ),
    );
  }
}
