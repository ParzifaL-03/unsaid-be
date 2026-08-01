import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';

export type ApiMeta = {
  page: number;
  totalPage: number;
  totalData: number;
};

export type ApiResponse<T> = {
  status: boolean;
  statusCode: number;
  data: T;
  meta: ApiMeta | null;
};

export function createApiResponse<T>(
  data: T,
  statusCode: number,
  meta: ApiMeta | null = null,
  status = statusCode >= 200 && statusCode < 400,
): ApiResponse<T> {
  return {
    status,
    statusCode,
    data,
    meta,
  };
}

function hasResponseEnvelope(
  value: unknown,
): value is { data?: unknown; meta?: ApiMeta | null } {
  return typeof value === 'object' && value !== null && 'data' in value;
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((value: unknown) => {
        if (hasResponseEnvelope(value)) {
          return createApiResponse(
            value.data,
            response.statusCode,
            value.meta ?? null,
          );
        }

        return createApiResponse(value, response.statusCode);
      }),
    );
  }
}
