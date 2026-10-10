import { APP_MESSAGES } from "@/lib/constants/messages";
import type { FormDefinition, Question, ThemeDefinition } from "./types";

export type ConflictType =
  | "property_collision"
  | "choice_collision"
  | "delete_vs_modify"
  | "modify_vs_delete"
  | "reorder_collision"
  | "theme_collision"
  | "metadata_collision";

export interface ConflictResolutionOption {
  key: "local" | "server";
  label: string;
  value: unknown;
}

export interface ThreeWayConflict {
  id: string;
  type: ConflictType;
  questionId?: string;
  questionLabel?: string;
  property?: string;
  baseValue: unknown;
  localValue: unknown;
  serverValue: unknown;
  description: string;
  options: ConflictResolutionOption[];
}

export interface ThreeWayMergeResult {
  hasConflicts: boolean;
  conflicts: ThreeWayConflict[];
  mergedDefinition: FormDefinition;
  mergedTheme: ThemeDefinition;
  summary: {
    appliedLocalChanges: string[];
    appliedServerChanges: string[];
    unresolvedConflicts: number;
  };
}

function areQuestionsEqual(a: Question, b: Question): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Executes a deterministic three-way merge between:
 * - base: Draft snapshot at the last acknowledged revision
 * - local: Unsaved local working draft
 * - server: Latest server draft aggregate retrieved after HTTP 409
 *
 * Automatically merges non-overlapping changes while identifying true collisions.
 */
export function threeWayMergeDrafts(params: {
  baseDefinition: FormDefinition;
  localDefinition: FormDefinition;
  serverDefinition: FormDefinition;
  baseTheme: ThemeDefinition;
  localTheme: ThemeDefinition;
  serverTheme: ThemeDefinition;
  resolutions?: Record<string, "local" | "server">;
}): ThreeWayMergeResult {
  const {
    baseDefinition: base,
    localDefinition: local,
    serverDefinition: server,
    baseTheme,
    localTheme,
    serverTheme,
    resolutions = {},
  } = params;

  const conflicts: ThreeWayConflict[] = [];
  const appliedLocalChanges: string[] = [];
  const appliedServerChanges: string[] = [];

  // 1. Metadata: Title
  let mergedTitle = local.title;
  if (local.title === base.title && server.title !== base.title) {
    mergedTitle = server.title;
    appliedServerChanges.push(
      APP_MESSAGES.UPDATED_FORM_TITLE_TO_FORMATTED(server.title),
    );
  } else if (local.title !== base.title && server.title === base.title) {
    mergedTitle = local.title;
    appliedLocalChanges.push(
      APP_MESSAGES.KEPT_LOCAL_FORM_TITLE_FORMATTED(local.title),
    );
  } else if (local.title !== server.title) {
    const conflictId = "metadata-title";
    conflicts.push({
      id: conflictId,
      type: "metadata_collision",
      property: "title",
      baseValue: base.title,
      localValue: local.title,
      serverValue: server.title,
      description:
        APP_MESSAGES.FORM_TITLE_WAS_EDITED_DIFFERENTLY_ON_LOCAL_FORMATTED(
          local.title,
          server.title,
        ),
      options: [
        {
          key: "local",
          label: APP_MESSAGES.KEEP_LOCAL_FORMATTED(local.title),
          value: local.title,
        },
        {
          key: "server",
          label: APP_MESSAGES.USE_SERVER_FORMATTED(server.title),
          value: server.title,
        },
      ],
    });
    mergedTitle =
      resolutions[conflictId] === "server" ? server.title : local.title;
  }

  // 2. Metadata: Description
  let mergedDescription = local.description;
  const localDesc = local.description ?? "";
  const baseDesc = base.description ?? "";
  const serverDesc = server.description ?? "";
  if (localDesc === baseDesc && serverDesc !== baseDesc) {
    mergedDescription = server.description;
    appliedServerChanges.push(
      APP_MESSAGES.UPDATED_FORM_DESCRIPTION_FROM_SERVER,
    );
  } else if (localDesc !== baseDesc && serverDesc === baseDesc) {
    mergedDescription = local.description;
    appliedLocalChanges.push(APP_MESSAGES.KEPT_LOCAL_FORM_DESCRIPTION);
  } else if (localDesc !== serverDesc) {
    const conflictId = "metadata-description";
    conflicts.push({
      id: conflictId,
      type: "metadata_collision",
      property: "description",
      baseValue: base.description,
      localValue: local.description,
      serverValue: server.description,
      description:
        APP_MESSAGES.FORM_DESCRIPTION_MODIFIED_DIFFERENTLY_ON_LOCAL_AND_SERVER,
      options: [
        {
          key: "local",
          label: APP_MESSAGES.KEEP_LOCAL_DESCRIPTION,
          value: local.description,
        },
        {
          key: "server",
          label: APP_MESSAGES.USE_SERVER_DESCRIPTION,
          value: server.description,
        },
      ],
    });
    mergedDescription =
      resolutions[conflictId] === "server"
        ? server.description
        : local.description;
  }

  // 3. Theme Merging
  let mergedTheme = localTheme;
  const localThemeStr = JSON.stringify(localTheme);
  const baseThemeStr = JSON.stringify(baseTheme);
  const serverThemeStr = JSON.stringify(serverTheme);

  if (localThemeStr === baseThemeStr && serverThemeStr !== baseThemeStr) {
    mergedTheme = serverTheme;
    appliedServerChanges.push(
      APP_MESSAGES.APPLIED_SERVER_THEME_FORMATTED(serverTheme.presetName),
    );
  } else if (
    localThemeStr !== baseThemeStr &&
    serverThemeStr === baseThemeStr
  ) {
    mergedTheme = localTheme;
    appliedLocalChanges.push(
      APP_MESSAGES.KEPT_LOCAL_THEME_FORMATTED(localTheme.presetName),
    );
  } else if (localThemeStr !== serverThemeStr) {
    const conflictId = "theme";
    conflicts.push({
      id: conflictId,
      type: "theme_collision",
      baseValue: baseTheme.presetName,
      localValue: localTheme.presetName,
      serverValue: serverTheme.presetName,
      description: APP_MESSAGES.THEME_WAS_CHANGED_TO_FORMATTED(
        localTheme.presetName,
        serverTheme.presetName,
      ),
      options: [
        {
          key: "local",
          label: APP_MESSAGES.KEEP_LOCAL_THEME_FORMATTED(localTheme.presetName),
          value: localTheme,
        },
        {
          key: "server",
          label: APP_MESSAGES.USE_SERVER_THEME_FORMATTED(
            serverTheme.presetName,
          ),
          value: serverTheme,
        },
      ],
    });
    mergedTheme =
      resolutions[conflictId] === "server" ? serverTheme : localTheme;
  }

  // 4. Questions 3-way reconciliation
  const baseMap = new Map<string, Question>(
    base.questions.map((q) => [q.id, q]),
  );
  const localMap = new Map<string, Question>(
    local.questions.map((q) => [q.id, q]),
  );
  const serverMap = new Map<string, Question>(
    server.questions.map((q) => [q.id, q]),
  );

  const allIds = new Set<string>([
    ...baseMap.keys(),
    ...localMap.keys(),
    ...serverMap.keys(),
  ]);

  const resolvedQuestions = new Map<string, Question>();

  for (const qId of allIds) {
    const inBase = baseMap.has(qId);
    const inLocal = localMap.has(qId);
    const inServer = serverMap.has(qId);

    const baseQ = baseMap.get(qId);
    const localQ = localMap.get(qId);
    const serverQ = serverMap.get(qId);

    // Scenario A: Question exists in all three
    if (inBase && inLocal && inServer && baseQ && localQ && serverQ) {
      const localChanged = !areQuestionsEqual(localQ, baseQ);
      const serverChanged = !areQuestionsEqual(serverQ, baseQ);

      if (!localChanged && !serverChanged) {
        resolvedQuestions.set(qId, baseQ);
      } else if (!localChanged && serverChanged) {
        resolvedQuestions.set(qId, serverQ);
        appliedServerChanges.push(
          APP_MESSAGES.APPLIED_SERVER_EDITS_TO_FORMATTED(serverQ.label),
        );
      } else if (localChanged && !serverChanged) {
        resolvedQuestions.set(qId, localQ);
        appliedLocalChanges.push(
          APP_MESSAGES.PRESERVED_LOCAL_EDITS_TO_FORMATTED(localQ.label),
        );
      } else if (areQuestionsEqual(localQ, serverQ)) {
        resolvedQuestions.set(qId, localQ);
        appliedLocalChanges.push(
          APP_MESSAGES.BOTH_ADMINS_MADE_IDENTICAL_CHANGE_TO_FORMATTED(
            localQ.label,
          ),
        );
      } else {
        // Both changed question differently -> Check property level
        const propertyConflicts: string[] = [];

        // Check label
        if (
          localQ.label !== serverQ.label &&
          localQ.label !== baseQ.label &&
          serverQ.label !== baseQ.label
        ) {
          propertyConflicts.push("label");
        }
        // Check required
        if (
          localQ.required !== serverQ.required &&
          localQ.required !== baseQ.required &&
          serverQ.required !== baseQ.required
        ) {
          propertyConflicts.push("required");
        }
        // Check type
        if (localQ.type !== serverQ.type) {
          propertyConflicts.push("type");
        }
        // Check options if choices field
        if ("options" in localQ && "options" in serverQ && "options" in baseQ) {
          const lOpt = JSON.stringify(localQ.options);
          const sOpt = JSON.stringify(serverQ.options);
          const bOpt = JSON.stringify(baseQ.options);
          if (lOpt !== sOpt && lOpt !== bOpt && sOpt !== bOpt) {
            propertyConflicts.push("options");
          }
        }
        // Check visibility
        const lVis = JSON.stringify(localQ.visibility);
        const sVis = JSON.stringify(serverQ.visibility);
        const bVis = JSON.stringify(baseQ.visibility);
        if (lVis !== sVis && lVis !== bVis && sVis !== bVis) {
          propertyConflicts.push("visibility");
        }

        const conflictId = `q-${qId}-collision`;
        const conflictType: ConflictType = propertyConflicts.includes("options")
          ? "choice_collision"
          : "property_collision";

        conflicts.push({
          id: conflictId,
          type: conflictType,
          questionId: qId,
          questionLabel: localQ.label,
          property: propertyConflicts.join(", ") || "content",
          baseValue: baseQ,
          localValue: localQ,
          serverValue: serverQ,
          description: `Question "${localQ.label}" was modified concurrently (${propertyConflicts.join(", ") || APP_MESSAGES.MULTIPLE_PROPERTIES}).`,
          options: [
            {
              key: "local",
              label: APP_MESSAGES.KEEP_LOCAL_VERSION_FORMATTED(localQ.label),
              value: localQ,
            },
            {
              key: "server",
              label: APP_MESSAGES.USE_SERVER_VERSION_FORMATTED(serverQ.label),
              value: serverQ,
            },
          ],
        });

        const chosenQ = resolutions[conflictId] === "server" ? serverQ : localQ;
        resolvedQuestions.set(qId, chosenQ);
      }
    }
    // Scenario B: Added only locally
    else if (!inBase && inLocal && !inServer && localQ) {
      resolvedQuestions.set(qId, localQ);
      appliedLocalChanges.push(
        APP_MESSAGES.KEPT_NEWLY_ADDED_QUESTION_FORMATTED(localQ.label),
      );
    }
    // Scenario C: Added only on server
    else if (!inBase && !inLocal && inServer && serverQ) {
      resolvedQuestions.set(qId, serverQ);
      appliedServerChanges.push(
        APP_MESSAGES.INCLUDED_SERVER_ADDED_QUESTION_FORMATTED(serverQ.label),
      );
    }
    // Scenario D: Added on both (rare ID collision with different content)
    else if (!inBase && inLocal && inServer && localQ && serverQ) {
      if (areQuestionsEqual(localQ, serverQ)) {
        resolvedQuestions.set(qId, localQ);
      } else {
        const conflictId = `q-${qId}-add-collision`;
        conflicts.push({
          id: conflictId,
          type: "property_collision",
          questionId: qId,
          questionLabel: localQ.label,
          baseValue: null,
          localValue: localQ,
          serverValue: serverQ,
          description: APP_MESSAGES.QUESTION_ID_FORMATTED(qId),
          options: [
            {
              key: "local",
              label: APP_MESSAGES.KEEP_LOCAL_FORMATTED_2(localQ.label),
              value: localQ,
            },
            {
              key: "server",
              label: APP_MESSAGES.USE_SERVER_FORMATTED_2(serverQ.label),
              value: serverQ,
            },
          ],
        });
        resolvedQuestions.set(
          qId,
          resolutions[conflictId] === "server" ? serverQ : localQ,
        );
      }
    }
    // Scenario E: Deleted locally, but still in server
    else if (inBase && !inLocal && inServer && baseQ && serverQ) {
      const serverModified = !areQuestionsEqual(serverQ, baseQ);
      if (serverModified) {
        // Server modified a question that local deleted
        const conflictId = `q-${qId}-del-vs-mod`;
        conflicts.push({
          id: conflictId,
          type: "delete_vs_modify",
          questionId: qId,
          questionLabel: serverQ.label,
          baseValue: baseQ,
          localValue: null,
          serverValue: serverQ,
          description: `Question "${serverQ.label}" was modified on the server, but deleted locally.`,
          options: [
            {
              key: "local",
              label: APP_MESSAGES.CONFIRM_DELETION_REMOVE_QUESTION,
              value: null,
            },
            {
              key: "server",
              label: APP_MESSAGES.KEEP_MODIFIED_SERVER_QUESTION,
              value: serverQ,
            },
          ],
        });
        if (resolutions[conflictId] === "server") {
          resolvedQuestions.set(qId, serverQ);
        }
      } else {
        appliedLocalChanges.push(
          APP_MESSAGES.DELETED_QUESTION_FORMATTED(baseQ.label),
        );
      }
    }
    // Scenario F: Deleted on server, but still in local
    else if (inBase && inLocal && !inServer && baseQ && localQ) {
      const localModified = !areQuestionsEqual(localQ, baseQ);
      if (localModified) {
        // Local modified a question that server deleted
        const conflictId = `q-${qId}-mod-vs-del`;
        conflicts.push({
          id: conflictId,
          type: "modify_vs_delete",
          questionId: qId,
          questionLabel: localQ.label,
          baseValue: baseQ,
          localValue: localQ,
          serverValue: null,
          description: `Question "${localQ.label}" was edited locally, but deleted on the server.`,
          options: [
            {
              key: "local",
              label: APP_MESSAGES.KEEP_LOCAL_EDITED_QUESTION,
              value: localQ,
            },
            {
              key: "server",
              label: APP_MESSAGES.ACCEPT_DELETION_REMOVE_QUESTION,
              value: null,
            },
          ],
        });
        if (resolutions[conflictId] !== "server") {
          resolvedQuestions.set(qId, localQ);
        }
      } else {
        appliedServerChanges.push(
          APP_MESSAGES.ACCEPTED_SERVER_DELETION_OF_FORMATTED(baseQ.label),
        );
      }
    }
  }

  // 5. Question Ordering Synthesis
  // Build ordering prioritizing local sequence for local questions, but preserving server insertion positions
  const mergedQuestions: Question[] = [];
  const processedIds = new Set<string>();

  // First place questions following local definition order
  for (const localQ of local.questions) {
    if (resolvedQuestions.has(localQ.id)) {
      mergedQuestions.push(resolvedQuestions.get(localQ.id)!);
      processedIds.add(localQ.id);
    }
  }

  // Insert server questions preserving their relative position when possible
  for (let i = 0; i < server.questions.length; i++) {
    const serverQ = server.questions[i];
    if (
      !serverQ ||
      processedIds.has(serverQ.id) ||
      !resolvedQuestions.has(serverQ.id)
    ) {
      continue;
    }
    const resolvedQ = resolvedQuestions.get(serverQ.id)!;

    // Look for previous sibling in server.questions that exists in mergedQuestions
    let insertIndex = -1;
    for (let p = i - 1; p >= 0; p--) {
      const prevServerQ = server.questions[p];
      if (prevServerQ && processedIds.has(prevServerQ.id)) {
        const foundIdx = mergedQuestions.findIndex(
          (q) => q.id === prevServerQ.id,
        );
        if (foundIdx !== -1) {
          insertIndex = foundIdx + 1;
          break;
        }
      }
    }

    if (insertIndex !== -1) {
      mergedQuestions.splice(insertIndex, 0, resolvedQ);
    } else {
      // Look for next sibling in server.questions that exists in mergedQuestions
      let nextIndex = -1;
      for (let n = i + 1; n < server.questions.length; n++) {
        const nextServerQ = server.questions[n];
        if (nextServerQ && processedIds.has(nextServerQ.id)) {
          const foundIdx = mergedQuestions.findIndex(
            (q) => q.id === nextServerQ.id,
          );
          if (foundIdx !== -1) {
            nextIndex = foundIdx;
            break;
          }
        }
      }
      if (nextIndex !== -1) {
        mergedQuestions.splice(nextIndex, 0, resolvedQ);
      } else {
        mergedQuestions.push(resolvedQ);
      }
    }
    processedIds.add(serverQ.id);
  }

  // Detect reordering conflict if order of shared questions differs between local and server
  const sharedIdsInLocal = local.questions
    .filter((q) => serverMap.has(q.id))
    .map((q) => q.id);
  const sharedIdsInServer = server.questions
    .filter((q) => localMap.has(q.id))
    .map((q) => q.id);

  if (
    sharedIdsInLocal.length > 1 &&
    JSON.stringify(sharedIdsInLocal) !== JSON.stringify(sharedIdsInServer)
  ) {
    // Both sides reordered
    const localReordered =
      JSON.stringify(sharedIdsInLocal) !==
      JSON.stringify(
        base.questions
          .filter((q) => serverMap.has(q.id) && localMap.has(q.id))
          .map((q) => q.id),
      );
    const serverReordered =
      JSON.stringify(sharedIdsInServer) !==
      JSON.stringify(
        base.questions
          .filter((q) => serverMap.has(q.id) && localMap.has(q.id))
          .map((q) => q.id),
      );

    if (localReordered && serverReordered) {
      const conflictId = "ordering-collision";
      conflicts.push({
        id: conflictId,
        type: "reorder_collision",
        baseValue: base.questions.map((q) => q.id),
        localValue: sharedIdsInLocal,
        serverValue: sharedIdsInServer,
        description:
          APP_MESSAGES.QUESTION_DISPLAY_ORDERING_WAS_REARRANGED_CONCURRENTLY_BY_BOTH,
        options: [
          {
            key: "local",
            label: APP_MESSAGES.USE_LOCAL_QUESTION_ORDERING,
            value: sharedIdsInLocal,
          },
          {
            key: "server",
            label: APP_MESSAGES.USE_SERVER_QUESTION_ORDERING,
            value: sharedIdsInServer,
          },
        ],
      });

      if (resolutions[conflictId] === "server") {
        // Re-sort merged questions matching server order
        const orderMap = new Map<string, number>(
          server.questions.map((q, i) => [q.id, i]),
        );
        mergedQuestions.sort((a, b) => {
          const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
          const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
          return orderA - orderB;
        });
      }
    } else if (serverReordered) {
      appliedServerChanges.push(
        APP_MESSAGES.APPLIED_SERVER_QUESTION_REORDERING,
      );
      const orderMap = new Map<string, number>(
        server.questions.map((q, i) => [q.id, i]),
      );
      mergedQuestions.sort((a, b) => {
        const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return orderA - orderB;
      });
    } else if (localReordered) {
      appliedLocalChanges.push(
        APP_MESSAGES.PRESERVED_LOCAL_QUESTION_REORDERING,
      );
    }
  }

  const mergedDefinition: FormDefinition = {
    schemaVersion: local.schemaVersion || 1,
    title: mergedTitle,
    description: mergedDescription,
    questions: mergedQuestions,
  };

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    mergedDefinition,
    mergedTheme,
    summary: {
      appliedLocalChanges,
      appliedServerChanges,
      unresolvedConflicts: conflicts.length,
    },
  };
}
