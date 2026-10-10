import { APP_MESSAGES } from "@/lib/constants/messages";
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
    message: string = APP_MESSAGES.REVISION_CONFLICT_THE_RESOURCE_WAS_UPDATED_BY_ANOTHER_REQUEST,
  ): AppError {
    return new AppError(ErrorCode.REVISION_CONFLICT, message, 409, {
      expectedRevision: expected,
      currentRevision: current,
    });
  }

  public static invalidForm(
    errors: Array<{ questionId?: string; issue: string; code?: string }>,
    message: string = APP_MESSAGES.FORM_DEFINITION_DOES_NOT_MEET_PUBLISH_REQUIREMENTS,
  ): AppError {
    return new AppError(ErrorCode.INVALID_FORM, message, 422, {
      validationErrors: errors,
    });
  }

  public static invalidAnswer(
    errors: Array<{ questionId?: string; issue: string; code?: string }>,
    message: string = APP_MESSAGES.ONE_OR_MORE_ANSWERS_FAILED_VALIDATION,
  ): AppError {
    return new AppError(ErrorCode.INVALID_ANSWER, message, 422, {
      validationErrors: errors,
    });
  }

  public static sessionUnauthorized(
    message: string = APP_MESSAGES.INVALID_OR_EXPIRED_SESSION_CREDENTIALS,
  ): AppError {
    return new AppError(ErrorCode.SESSION_UNAUTHORIZED, message, 401);
  }

  public static sessionCompleted(
    message: string = APP_MESSAGES.SESSION_HAS_ALREADY_BEEN_FINALIZED,
  ): AppError {
    return new AppError(ErrorCode.SESSION_COMPLETED, message, 409);
  }

  public static resumeRateLimited(retryAfterSeconds: number = 900): AppError {
    return new AppError(
      ErrorCode.RESUME_RATE_LIMITED,
      APP_MESSAGES.TOO_MANY_RECOVERY_ATTEMPTS_PLEASE_TRY_AGAIN_LATER,
      429,
      { retryAfterSeconds },
    );
  }
}
