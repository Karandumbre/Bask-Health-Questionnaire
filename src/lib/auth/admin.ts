import "server-only";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminMemberships, forms } from "@/lib/db/schema";
import {
  createClient,
  getServerVerifiedUser,
  type VerifiedAuthUser,
} from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export type AdminRole = "owner" | "editor";

export interface WorkspaceMembershipRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: AdminRole;
  createdAt: Date;
  revokedAt: Date | null;
}

/**
 * Validates that the current request has an authenticated administrative user.
 * Uses server-verified claims or re-verified user; rejects unauthenticated calls.
 */
export async function requireAdmin(): Promise<VerifiedAuthUser> {
  const supabase = await createClient();
  const user = await getServerVerifiedUser(supabase);

  if (!user) {
    throw new AppError(
      "UNAUTHORIZED",
      "Authentication required for administrative access.",
      401,
    );
  }

  return user;
}

/**
 * Validates that an authenticated user has an active membership in the specified workspace.
 * Optionally enforces the specific role (e.g. "owner").
 */
export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string,
  requiredRole?: AdminRole,
): Promise<WorkspaceMembershipRecord> {
  const [membership] = await db
    .select()
    .from(adminMemberships)
    .where(
      and(
        eq(adminMemberships.userId, userId),
        eq(adminMemberships.workspaceId, workspaceId),
        isNull(adminMemberships.revokedAt),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new AppError(
      "FORBIDDEN",
      "Access denied: You are not a member of this workspace.",
      403,
      { resourceType: "workspace" },
    );
  }

  if (requiredRole === "owner" && membership.role !== "owner") {
    throw new AppError(
      "FORBIDDEN",
      "Access denied: Owner privileges required for this action.",
      403,
      { resourceType: "workspace" },
    );
  }

  return membership as WorkspaceMembershipRecord;
}

/**
 * Resolves form by ID and validates that the user is an active member
 * of the workspace owning the form.
 */
export async function requireFormWorkspaceAccess(
  formId: string,
  userId: string,
  requiredRole?: AdminRole,
) {
  const [form] = await db
    .select()
    .from(forms)
    .where(eq(forms.id, formId))
    .limit(1);

  if (!form) {
    throw new AppError("NOT_FOUND", "Form not found.", 404, {
      resourceType: "form",
    });
  }

  const membership = await requireWorkspaceMembership(
    userId,
    form.workspaceId,
    requiredRole,
  );

  return { form, membership };
}

/**
 * Helper to authenticate user and verify workspace access in a single call.
 */
export async function requireAdminWorkspaceAccess(
  workspaceId: string,
  requiredRole?: AdminRole,
): Promise<{ user: VerifiedAuthUser; membership: WorkspaceMembershipRecord }> {
  const user = await requireAdmin();
  const membership = await requireWorkspaceMembership(
    user.id,
    workspaceId,
    requiredRole,
  );
  return { user, membership };
}

export { getUserWorkspaces } from "@/features/workspaces/server/workspace-service";
