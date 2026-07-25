import { Injectable, PipeTransform } from '@nestjs/common';
import { z, type ZodType } from 'zod';
import { ApiError, type ErrorFields } from './api-error';

function compactFieldErrors(
  fields: Record<string, string[] | undefined>,
): ErrorFields {
  return Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string[]] =>
      Array.isArray(entry[1]),
    ),
  );
}

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const { fieldErrors } = z.flattenError(result.error);
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'Request data is invalid.',
      compactFieldErrors(fieldErrors),
    );
  }
}

export function parseResponse<T>(schema: ZodType<T>, value: T): T {
  return schema.parse(value);
}
