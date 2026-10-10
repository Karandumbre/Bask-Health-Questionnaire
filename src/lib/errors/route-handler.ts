import "server-only";
import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

/**
 * Standardized Route Handler error catcher.
 * Serializes AppErrors to safe JSON envelopes without leaking internal exceptions or stack traces.
 */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_FORM",
          message: "Request data is invalid.",
          details: {
            validationErrors: error.issues.map((issue) => ({
              field: issue.path.join("."),
              issue: issue.message,
            })),
          },
        },
      },
      { status: 422 },
    );
  }

  // Sanitize unexpected server errors
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred.",
      },
    },
    { status: 500 },
  );
}
