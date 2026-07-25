import { HttpException } from '@nestjs/common';

export type ErrorFields = Record<string, string[]>;

export class ApiError extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: ErrorFields,
  ) {
    super(message, status);
  }
}
