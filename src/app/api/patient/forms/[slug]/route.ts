import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { forms, publishedVersions } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { handleRouteError } from "@/lib/errors/route-handler";
import type {
  FormDefinition,
  ThemeDefinition,
} from "@/features/forms/domain/types";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/patient/forms/[slug]
 * Retrieves the published form definition and theme snapshot by public slug.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const [record] = await db
      .select({
        version: publishedVersions,
        formArchivedAt: forms.archivedAt,
      })
      .from(publishedVersions)
      .innerJoin(forms, eq(publishedVersions.formId, forms.id))
      .where(
        and(eq(publishedVersions.publicSlug, slug), isNull(forms.archivedAt)),
      )
      .limit(1);

    if (!record) {
      throw new AppError(
        "NOT_FOUND",
        "Clinical intake form not found or is no longer accepting submissions.",
        404,
        { resourceType: "published_form" },
      );
    }

    const { version } = record;
    const definition = version.definitionSnapshot as FormDefinition;
    const theme = version.themeSnapshot as ThemeDefinition;

    return NextResponse.json({
      success: true,
      data: {
        publicSlug: version.publicSlug,
        versionNumber: version.versionNumber,
        publishedAt: version.publishedAt,
        definition,
        theme,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
