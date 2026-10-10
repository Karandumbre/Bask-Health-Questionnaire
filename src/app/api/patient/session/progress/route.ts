import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError } from "@/lib/errors/route-handler";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { parseRequestJson } from "@/lib/http/request-validation";
import { savePatientProgress } from "@/features/patients/server/session-service";
import {
  getSessionCookieName,
  parseSessionCookie,
  clearSessionCapabilityCookie,
  isSessionAccessError,
} from "@/features/patients/server/patient-cookies";
import { AppError } from "@/lib/errors";
import type { PatientAnswers } from "@/features/patients/domain/types";

const saveProgressSchema = z.object({
  publicSlug: z.string().trim().min(1),
  expectedSessionRevision: z.number().int().nonnegative(),
  answers: z.record(z.string(), z.unknown()),
});

/**
 * PUT /api/patient/session/progress
 * Saves in-progress patient intake answers with revision protection and hidden answer pruning.
 */
export async function PUT(request: NextRequest) {
  let publicSlug: string | undefined;
  try {
    verifyRequestOrigin(request);
    const body = await parseRequestJson(request, saveProgressSchema);
    publicSlug = body.publicSlug;

    const cookieName = getSessionCookieName(body.publicSlug);
    const cookieValue = request.cookies.get(cookieName)?.value;

    const credentials = parseSessionCookie(cookieValue);
    if (!credentials) {
      throw AppError.sessionUnauthorized(
        "Active session credentials not found. Please resume your session.",
      );
    }

    const result = await savePatientProgress({
      sessionId: credentials.sessionId,
      capabilityToken: credentials.capabilityToken,
      expectedSessionRevision: body.expectedSessionRevision,
      answers: body.answers as PatientAnswers,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionRevision: result.sessionRevision,
        sanitizedAnswers: result.sanitizedAnswers,
      },
    });
  } catch (error) {
    const response = handleRouteError(error);
    if (publicSlug && isSessionAccessError(error)) {
      clearSessionCapabilityCookie(response, publicSlug);
    }
    return response;
  }
}
