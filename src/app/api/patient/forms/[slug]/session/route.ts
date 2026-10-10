import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/errors/route-handler";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import {
  createPatientSession,
  authenticatePatientSession,
} from "@/features/patients/server/session-service";
import {
  getSessionCookieName,
  parseSessionCookie,
  setSessionCapabilityCookie,
} from "@/features/patients/server/patient-cookies";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishedVersions } from "@/lib/db/schema";
import type {
  FormDefinition,
  ThemeDefinition,
} from "@/features/forms/domain/types";
import type { PatientAnswers } from "@/features/patients/domain/types";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/patient/forms/[slug]/session
 * Inspects the current browser's capability cookie for an active session on this form.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const cookieName = getSessionCookieName(slug);
    const cookieValue = request.cookies.get(cookieName)?.value;

    const credentials = parseSessionCookie(cookieValue);
    if (!credentials) {
      return NextResponse.json({
        success: true,
        data: { active: false },
      });
    }

    try {
      const session = await authenticatePatientSession(
        credentials.sessionId,
        credentials.capabilityToken,
      );

      // Fetch version definition
      const [version] = await db
        .select()
        .from(publishedVersions)
        .where(eq(publishedVersions.id, session.publishedVersionId))
        .limit(1);

      if (!version) {
        return NextResponse.json({
          success: true,
          data: { active: false },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          active: true,
          sessionId: session.id,
          sessionReference: session.sessionReference,
          status: session.status,
          sessionRevision: session.revision,
          currentAnswers: (session.answerJson ?? {}) as PatientAnswers,
          publicSlug: version.publicSlug,
          versionNumber: version.versionNumber,
          definition: version.definitionSnapshot as FormDefinition,
          theme: version.themeSnapshot as ThemeDefinition,
        },
      });
    } catch {
      // Invalid or expired session cookie -> active: false
      return NextResponse.json({
        success: true,
        data: { active: false },
      });
    }
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/patient/forms/[slug]/session
 * Starts a new patient intake session pinned to the current published version.
 * Issues an HttpOnly namespaced capability cookie and returns recovery credentials.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    verifyRequestOrigin(request);
    const { slug } = await context.params;

    const result = await createPatientSession({ publicSlug: slug });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          sessionId: result.sessionId,
          sessionReference: result.sessionReference,
          recoveryCode: result.recoveryCode,
          publicSlug: result.publicSlug,
          versionNumber: result.versionNumber,
          definition: result.definition,
          theme: result.theme,
          currentAnswers: result.currentAnswers,
          sessionRevision: result.sessionRevision,
        },
      },
      { status: 201 },
    );

    // Secure HttpOnly capability cookie
    setSessionCapabilityCookie(
      response,
      slug,
      result.sessionId,
      result.capabilityToken,
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
