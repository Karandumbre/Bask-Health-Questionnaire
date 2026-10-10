import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError } from "@/lib/errors/route-handler";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { parseRequestJson } from "@/lib/http/request-validation";
import { resumePatientSession } from "@/features/patients/server/session-service";
import { setSessionCapabilityCookie } from "@/features/patients/server/patient-cookies";

const resumeSchema = z.object({
  sessionReference: z.string().trim().min(1),
  recoveryCode: z.string().trim().min(1),
});

/**
 * POST /api/patient/session/resume
 * Cross-browser recovery using public session reference and one-time recovery code.
 * Implements rate limiting, atomic credential rotation, and issues a fresh capability cookie.
 */
export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);
    const body = await parseRequestJson(request, resumeSchema);

    const result = await resumePatientSession({
      sessionReference: body.sessionReference,
      recoveryCode: body.recoveryCode,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        sessionReference: result.sessionReference,
        newRecoveryCode: result.newRecoveryCode,
        publicSlug: result.publicSlug,
        versionNumber: result.versionNumber,
        definition: result.definition,
        theme: result.theme,
        currentAnswers: result.currentAnswers,
        sessionRevision: result.sessionRevision,
      },
    });

    // Set fresh capability cookie for the new browser session
    setSessionCapabilityCookie(
      response,
      result.publicSlug,
      result.sessionId,
      result.newCapabilityToken,
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
