import { ROUTES } from "@/lib/constants/application";
import { redirect } from "next/navigation";
import { requireAdmin, getUserWorkspaces } from "@/lib/auth/admin";
import { listWorkspaceForms } from "@/features/forms/server/draft-service";
import {
  FormDashboard,
  type FormListItem,
} from "@/features/forms/components/FormDashboard";

export default async function AdminFormsPage() {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect(ROUTES.adminLogin);
  }

  const workspaces = await getUserWorkspaces(user.id, user.email);
  const activeWorkspace = workspaces[0];

  if (!activeWorkspace) {
    redirect(ROUTES.adminLogin);
  }

  const forms = await listWorkspaceForms(activeWorkspace.workspaceId, user.id);

  const formattedForms: FormListItem[] = forms.map((f) => ({
    id: f.id,
    name: f.name,
    workspaceId: f.workspaceId,
    latestPublishedVersionNumber: f.latestPublishedVersionNumber,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    draftRevision: f.draftRevision,
    draftUpdatedAt: f.draftUpdatedAt,
  }));

  return (
    <FormDashboard
      initialForms={formattedForms}
      workspaceName={activeWorkspace.workspaceName}
      userEmail={user.email}
    />
  );
}
