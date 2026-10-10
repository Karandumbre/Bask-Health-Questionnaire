import { AppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/application";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getFormDraft } from "@/features/forms/server/draft-service";
import { BuilderProvider } from "@/features/forms/context/builder-context";
import { AdminHeader } from "@/features/forms/components/AdminHeader";
import { FieldNavigator } from "@/features/forms/components/FieldNavigator";
import { FormCanvas } from "@/features/forms/components/FormCanvas";
import { QuestionInspector } from "@/features/forms/components/QuestionInspector";
import { ConflictModal } from "@/features/forms/components/ConflictModal";
import { PublishModal } from "@/features/forms/components/PublishModal";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function FormEditPage({ params }: PageProps) {
  const { formId } = await params;

  let user;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 401) throw error;
    redirect(`/admin/login?next=/admin/forms/${formId}/edit`);
  }

  let data;
  try {
    data = await getFormDraft(formId, user.id);
  } catch (error) {
    if (!(error instanceof AppError) || ![403, 404].includes(error.status))
      throw error;
    redirect(ROUTES.adminForms);
  }

  return (
    <BuilderProvider
      key={data.form.id}
      formId={data.form.id}
      initialName={data.form.name}
      initialRevision={data.draft.revision}
      initialDefinition={data.definition}
      initialTheme={data.theme}
    >
      <div className="min-h-screen flex flex-col bg-gray-100">
        <AdminHeader />
        <div className="flex-1 flex overflow-hidden">
          <FieldNavigator />
          <FormCanvas />
          <QuestionInspector />
        </div>

        {/* Floating Modals */}
        <ConflictModal />
        <PublishModal />
      </div>
    </BuilderProvider>
  );
}
