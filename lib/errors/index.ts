import { logger } from "@/lib/logger";

export const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  public statusCode: number;
  public errorCode: ErrorCode;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.name = "AppError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, details?: any) {
    return new AppError(message, 400, ErrorCodes.BAD_REQUEST, true, details);
  }
  static unauthorized(message: string = "Unauthorized") {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED, true);
  }
  static forbidden(message: string = "Forbidden") {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN, true);
  }
  static notFound(message: string = "Resource not found") {
    return new AppError(message, 404, ErrorCodes.NOT_FOUND, true);
  }
  static conflict(message: string = "Conflict") {
    return new AppError(message, 409, ErrorCodes.CONFLICT, true);
  }
  static rateLimited(message: string = "Too many requests") {
    return new AppError(message, 429, ErrorCodes.RATE_LIMITED, true);
  }
  static internal(message: string = "Internal server error") {
    return new AppError(message, 500, ErrorCodes.INTERNAL_ERROR, false);
  }
}

// Log an error at the boundary (catch block, route handler, server action).
// Picks level based on `isOperational`, and falls back to logging unknown errors.
export function logError(error: unknown): void {
  if (error instanceof AppError) {
    const payload = {
      message: error.message,
      code: error.errorCode,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
    };
    if (error.isOperational) {
      logger.warn(payload);
    } else {
      logger.error(payload);
    }
    return;
  }

  // Anything else: treat as non-operational
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({
    message: err.message,
    stack: err.stack,
    err,
  });
}
