import type { ErrorCode } from '@megadon/types';

export class AppError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }

  static authRequired(msg = 'Authentication required') {
    return new AppError('AUTH_REQUIRED', msg, 401);
  }
  static forbidden(msg = 'Workspace access denied') {
    return new AppError('WORKSPACE_FORBIDDEN', msg, 403);
  }
  static notFound(msg = 'Resource not found') {
    return new AppError('NOT_FOUND', msg, 404);
  }
  static validation(msg: string) {
    return new AppError('VALIDATION_FAILED', msg, 400);
  }
  static provider(msg: string) {
    return new AppError('PROVIDER_FAILED', msg, 502);
  }
  static internal(msg = 'Internal error') {
    return new AppError('INTERNAL', msg, 500);
  }
}
