import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError } from "@/lib/errors/route-handler";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { parseRequestJson } from "@/lib/http/request-validation";
import { submitPatientSession } from "@/features/patients/server/submission-service";
import {
  getSessionCookieName,
  parseSessionCookie,
} from "@/features/patients/server/patient-cookies";
import { AppError } from "@/lib/errors";
import type { PatientAnswers } from "@/features/patients/domain/types";

const submitSchema = z.object({
  publicSlug: z.string().trim().min(1),
  answers: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/patient/session/submit
 * Executes transactional exactly-once submission against the pinned published version.
 * Returns existing confirmation on idempotent replays.
 */
export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);
    const body = await parseRequestJson(request, submitSchema);

    const cookieName = getSessionCookieName(body.publicSlug);
    const cookieValue = request.cookies.get(cookieName)?.value;

    const credentials = parseSessionCookie(cookieValue);
    if (!credentials) {
      throw AppError.sessionUnauthorized(
        "Active session credentials not found. Please resume your session.",
      );
    }

    const result = await submitPatientSession({
      sessionId: credentials.sessionId,
      capabilityToken: credentials.capabilityToken,
      answers: body.answers as PatientAnswers,
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionId: result.submissionId,
        sessionId: result.sessionId,
        submittedAt: result.submittedAt,
        status: result.status,
        isIdempotentReplay: result.isIdempotentReplay,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
