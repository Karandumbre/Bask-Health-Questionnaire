import { APP_MESSAGES } from "@/lib/constants/messages";
import "server-only";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminMemberships, workspaces } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import type { AdminRole } from "@/lib/auth/admin";

/**
 * Resolves all active workspaces for an authenticated user.
 * If user has no workspace yet (e.g. newly created reviewer account),
 * provisions a default workspace and assigns owner role.
 */
export async function getUserWorkspaces(
  userId: string,
  userEmail?: string | null,
): Promise<
  Array<{
    workspaceId: string;
    role: AdminRole;
    workspaceName: string;
    createdAt: Date;
  }>
> {
  const findMemberships = (executor: Pick<typeof db, "select"> = db) => {
    return executor
      .select({
        workspaceId: adminMemberships.workspaceId,
        role: adminMemberships.role,
        workspaceName: workspaces.name,
        createdAt: workspaces.createdAt,
      })
      .from(adminMemberships)
      .innerJoin(workspaces, eq(adminMemberships.workspaceId, workspaces.id))
      .where(
        and(
          eq(adminMemberships.userId, userId),
          isNull(adminMemberships.revokedAt),
        ),
      );
  };
  const existing = await findMemberships();
  if (existing.length > 0) return existing;

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
    );
    const memberships = await findMemberships(tx);
    if (memberships.length > 0) {
      return memberships as Array<{
        workspaceId: string;
        role: AdminRole;
        workspaceName: string;
        createdAt: Date;
      }>;
    }

    // Provision initial workspace for first-time admin / reviewer
    const defaultName = userEmail
      ? `${userEmail.split("@")[0]}'s Clinic`
      : APP_MESSAGES.CLINICAL_WORKSPACE;
    const [newWorkspace] = await tx
      .insert(workspaces)
      .values({ name: defaultName })
      .returning();

    if (!newWorkspace) {
      throw new AppError(
        "INTERNAL_ERROR",
        APP_MESSAGES.FAILED_TO_INITIALIZE_WORKSPACE,
        500,
      );
    }

    await tx.insert(adminMemberships).values({
      workspaceId: newWorkspace.id,
      userId,
      role: "owner",
    });

    return [
      {
        workspaceId: newWorkspace.id,
        role: "owner",
        workspaceName: newWorkspace.name,
        createdAt: newWorkspace.createdAt,
      },
    ];
  });
}
