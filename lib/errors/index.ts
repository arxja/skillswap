import { getLogger } from "@/lib/logger";

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

function sanitizeErrorDetails(details: unknown): unknown {
  if (details === null || details === undefined) {
    return details;
  }

  if (Array.isArray(details)) {
    return details.map(sanitizeErrorDetails);
  }

  if (typeof details !== "object") {
    return details;
  }

  return Object.fromEntries(
    Object.entries(details as Record<string, unknown>).map(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      const isSensitive = [
        "password",
        "secret",
        "token",
        "authorization",
        "cookie",
      ].some((field) => normalizedKey.includes(field));

      return [key, isSensitive ? "[REDACTED]" : sanitizeErrorDetails(value)];
    }),
  );
}

export class AppError extends Error {
  public statusCode: number;
  public errorCode: ErrorCode;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = sanitizeErrorDetails(details);
    this.name = "AppError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(
      message,
      400,
      ErrorCodes.BAD_REQUEST,
      true,
      sanitizeErrorDetails(details),
    );
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
  const requestLogger = getLogger();

  if (error instanceof AppError) {
    const payload = {
      message: error.message,
      code: error.errorCode,
      statusCode: error.statusCode,
      details: sanitizeErrorDetails(error.details),
      stack: error.stack,
    };
    if (error.isOperational) {
      requestLogger.warn(payload);
    } else {
      requestLogger.error(payload);
    }
    return;
  }

  // Anything else: treat as non-operational
  const err = error instanceof Error ? error : new Error(String(error));
  requestLogger.error({
    message: err.message,
    stack: err.stack,
    err,
  });
}
