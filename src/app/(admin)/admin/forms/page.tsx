import { AppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/application";
import { redirect } from "next/navigation";
import { requireAdmin, getUserWorkspaces } from "@/lib/auth/admin";
import { FormDashboard } from "@/features/forms/components/FormDashboard";

export default async function AdminFormsPage() {
  let user;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 401) throw error;
    redirect(ROUTES.adminLogin);
  }

  const workspaces = await getUserWorkspaces(user.id, user.email);
  const activeWorkspace = workspaces[0];

  if (!activeWorkspace) {
    redirect(ROUTES.adminLogin);
  }

  return (
    <FormDashboard
      key={`${user.id}:${activeWorkspace.workspaceId}`}
      userId={user.id}
      workspaceId={activeWorkspace.workspaceId}
      workspaceName={activeWorkspace.workspaceName}
      userEmail={user.email}
    />
  );
}
