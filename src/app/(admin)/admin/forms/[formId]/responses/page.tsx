import { Text } from "@/components/ui/text";
import Link from "next/link";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { AppError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/application";
import { requireAdmin, requireFormWorkspaceAccess } from "@/lib/auth/admin";
import {
  listFormSubmissions,
  countFormSubmissions,
} from "@/features/forms/server/response-service";
import { ResponsesView } from "@/features/forms/components/ResponsesView";
import type { SubmissionListItem } from "@/features/forms/client/responses-api";
import type { PatientAnswers } from "@/features/patients/domain/types";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormResponsesPage({ params }: PageProps) {
  const { formId } = await params;

  let user;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 401) throw error;
    redirect(`/admin/login?next=/admin/forms/${formId}/responses`);
  }

  let formAccess;
  try {
    formAccess = await requireFormWorkspaceAccess(formId, user.id, "editor");
  } catch (error: unknown) {
    // Permission denied or form not found
    const status = (error as { status?: number })?.status;
    if (status === 403 || status === 401) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-xs">
            <Text as="h2" variant="heading" tone="primary" weight="semibold">
              Access Denied
            </Text>
            <div className="mt-2">
              <Text as="p" variant="small" tone="muted">
                You do not have permission to view clinical responses for this
                form.
              </Text>
            </div>
            <Link
              href={ROUTES.adminForms}
              className="mt-4 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Back to Forms Dashboard
            </Link>
          </div>
        </div>
      );
    }
    if (error instanceof AppError && error.status === 404)
      redirect(ROUTES.adminForms);
    throw error;
  }

  let initialError: string | null = null;
  let submissionsRaw: Awaited<ReturnType<typeof listFormSubmissions>> = [];
  let initialTotalCount = 0;
  try {
    const [rawRows, count] = await Promise.all([
      listFormSubmissions({
        formId,
        userId: user.id,
        limit: 50,
        offset: 0,
      }),
      countFormSubmissions({
        formId,
        userId: user.id,
      }),
    ]);
    submissionsRaw = rawRows;
    initialTotalCount = count;
  } catch {
    initialError = APP_MESSAGES.RESPONSES_LOAD_FAILED;
    submissionsRaw = [];
    initialTotalCount = 0;
  }

  const initialSubmissions: SubmissionListItem[] = submissionsRaw.map(
    (sub) => ({
      id: sub.id,
      sessionId: sub.sessionId,
      sessionReference: sub.sessionReference,
      formName: sub.formName ?? formAccess.form.name,
      publishedVersionId: sub.publishedVersionId,
      versionNumber: sub.versionNumber,
      answerSnapshot: (sub.answerSnapshot ?? {}) as PatientAnswers,
      status: sub.status ?? "completed",
      submittedAt:
        typeof sub.submittedAt === "string"
          ? sub.submittedAt
          : sub.submittedAt.toISOString(),
    }),
  );

  return (
    <ResponsesView
      formId={formAccess.form.id}
      formName={formAccess.form.name}
      initialError={initialError}
      initialSubmissions={initialSubmissions}
      initialTotalCount={initialTotalCount}
    />
  );
}
