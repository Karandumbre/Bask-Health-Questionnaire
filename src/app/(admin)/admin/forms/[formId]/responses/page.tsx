import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/application";
import { requireAdmin, requireFormWorkspaceAccess } from "@/lib/auth/admin";
import { listFormSubmissions } from "@/features/forms/server/response-service";
import { ResponsesView } from "@/features/forms/components/ResponsesView";
import type { SubmissionListItem } from "@/features/forms/client/responses-api";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormResponsesPage({ params }: PageProps) {
  const { formId } = await params;

  let user;
  try {
    user = await requireAdmin();
  } catch {
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
            <h2 className="text-base font-semibold text-gray-900">Access Denied</h2>
            <p className="text-xs text-gray-500 mt-2">
              You do not have permission to view clinical responses for this form.
            </p>
            <a
              href={ROUTES.adminForms}
              className="mt-4 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Back to Forms Dashboard
            </a>
          </div>
        </div>
      );
    }
    redirect(ROUTES.adminForms);
  }

  let submissionsRaw: Awaited<ReturnType<typeof listFormSubmissions>> = [];
  try {
    submissionsRaw = await listFormSubmissions({
      formId,
      userId: user.id,
    });
  } catch {
    submissionsRaw = [];
  }

  const initialSubmissions: SubmissionListItem[] = submissionsRaw.map((sub) => ({
    id: sub.id,
    sessionId: sub.sessionId,
    sessionReference: sub.sessionReference,
    formName: sub.formName ?? formAccess.form.name,
    publishedVersionId: sub.publishedVersionId,
    versionNumber: sub.versionNumber,
    answerSnapshot: (sub.answerSnapshot ?? {}) as Record<string, unknown>,
    status: sub.status ?? "completed",
    submittedAt:
      typeof sub.submittedAt === "string"
        ? sub.submittedAt
        : sub.submittedAt.toISOString(),
  }));

  return (
    <ResponsesView
      formId={formAccess.form.id}
      formName={formAccess.form.name}
      initialSubmissions={initialSubmissions}
    />
  );
}
