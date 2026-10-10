/**
 * Safe application error codes and standard error representation.
 * Designed to never leak PHI, credentials, or internal database metadata.
 */

export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  REVISION_CONFLICT: "REVISION_CONFLICT",
  INVALID_FORM: "INVALID_FORM",
  INVALID_ANSWER: "INVALID_ANSWER",
  PUBLISH_CONFLICT: "PUBLISH_CONFLICT",
  SESSION_UNAUTHORIZED: "SESSION_UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_COMPLETED: "SESSION_COMPLETED",
  RESUME_RATE_LIMITED: "RESUME_RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface SafeErrorDetails {
  expectedRevision?: number | bigint;
  currentRevision?: number | bigint;
  resourceType?: string;
  retryAfterSeconds?: number;
  validationErrors?: Array<{
    field?: string;
    questionId?: string;
    issue: string;
    code?: string;
  }>;
}

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly status: number;
  public readonly details?: SafeErrorDetails;

  constructor(
    code: ErrorCodeType,
    message: string,
    status: number = 400,
    details?: SafeErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }

  public static revisionConflict(
    expected: number | bigint,
    current: number | bigint,
    message: string = "Revision conflict: the resource was updated by another request",
  ): AppError {
    return new AppError(ErrorCode.REVISION_CONFLICT, message, 409, {
      expectedRevision: expected,
      currentRevision: current,
    });
  }

  public static invalidForm(
    errors: Array<{ questionId?: string; issue: string; code?: string }>,
    message: string = "Form definition does not meet publish requirements",
  ): AppError {
    return new AppError(ErrorCode.INVALID_FORM, message, 422, {
      validationErrors: errors,
    });
  }

  public static invalidAnswer(
    errors: Array<{ questionId?: string; issue: string; code?: string }>,
    message: string = "One or more answers failed validation",
  ): AppError {
    return new AppError(ErrorCode.INVALID_ANSWER, message, 422, {
      validationErrors: errors,
    });
  }

  public static sessionUnauthorized(
    message: string = "Invalid or expired session credentials",
  ): AppError {
    return new AppError(ErrorCode.SESSION_UNAUTHORIZED, message, 401);
  }

  public static sessionCompleted(
    message: string = "Session has already been finalized",
  ): AppError {
    return new AppError(ErrorCode.SESSION_COMPLETED, message, 409);
  }

  public static resumeRateLimited(retryAfterSeconds: number = 900): AppError {
    return new AppError(
      ErrorCode.RESUME_RATE_LIMITED,
      "Too many recovery attempts. Please try again later.",
      429,
      { retryAfterSeconds },
    );
  }
}
