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

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (error instanceof ApiError) {
      response.status(error.getStatus()).json({
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
        },
      });
      return;
    }

    if (error instanceof HttpException) {
      response.status(error.getStatus()).json({
        error: {
          code: 'HTTP_ERROR',
          message: error.message,
        },
      });
      return;
    }

    const databaseUnavailable =
      error instanceof Error &&
      ['MongooseServerSelectionError', 'MongoNetworkError'].includes(
        error.name,
      );

    this.logger.error(error);
    response
      .status(
        databaseUnavailable
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      )
      .json({
        error: {
          code: databaseUnavailable ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR',
          message: databaseUnavailable
            ? 'The database is temporarily unavailable.'
            : 'An unexpected error occurred.',
        },
      });
  }
}
