import type { FormDefinition, Question, ThemeDefinition } from "./types";

export type DiffStatus =
  | "added_locally"
  | "added_on_server"
  | "removed_locally"
  | "removed_on_server"
  | "modified"
  | "unchanged";

export interface PropertyChange {
  property: string;
  localValue: string | boolean | number | null;
  serverValue: string | boolean | number | null;
}

export interface QuestionDiff {
  questionId: string;
  label: string;
  status: DiffStatus;
  changes: PropertyChange[];
}

export interface DraftComparison {
  localRevision: number;
  serverRevision: number;
  hasTitleChange: boolean;
  localTitle: string;
  serverTitle: string;
  questionDiffs: QuestionDiff[];
  metadataChanges: PropertyChange[];
  summary: {
    addedLocally: number;
    addedOnServer: number;
    modified: number;
    removedLocally: number;
    removedOnServer: number;
    totalDifferences: number;
  };
}

function stringifyOptions(q: Question): string {
  if ("options" in q && Array.isArray(q.options)) {
    return JSON.stringify(q.options);
  }
  return "";
}

function stringifyCondition(q: Question): string {
  if (!q.visibility) return "none";
  return `depends on ${q.visibility.parentQuestionId} (choice ${q.visibility.equalsOptionId})`;
}

/**
 * Compares local and server form definitions using stable question IDs.
 * Identifies added, modified, removed, and conflicting fields.
 */
export function compareDrafts(
  localDef: FormDefinition,
  serverDef: FormDefinition,
  localRevision: number,
  serverRevision: number,
  context: {
    baseDefinition?: FormDefinition;
    localTheme?: ThemeDefinition;
    serverTheme?: ThemeDefinition;
  } = {},
): DraftComparison {
  const localMap = new Map<string, Question>(
    localDef.questions.map((q) => [q.id, q]),
  );
  const serverMap = new Map<string, Question>(
    serverDef.questions.map((q) => [q.id, q]),
  );

  const allQuestionIds = new Set<string>([
    ...localMap.keys(),
    ...serverMap.keys(),
  ]);

  const metadataChanges: PropertyChange[] = [];
  if (localDef.description !== serverDef.description)
    metadataChanges.push({
      property: "description",
      localValue: localDef.description ?? "",
      serverValue: serverDef.description ?? "",
    });
  if (
    context.localTheme &&
    context.serverTheme &&
    JSON.stringify(context.localTheme) !== JSON.stringify(context.serverTheme)
  )
    metadataChanges.push({
      property: "theme",
      localValue: JSON.stringify(context.localTheme),
      serverValue: JSON.stringify(context.serverTheme),
    });
  const questionDiffs: QuestionDiff[] = [];
  let addedLocally = 0;
  let addedOnServer = 0;
  let modified = 0;
  let removedLocally = 0;
  let removedOnServer = 0;

  for (const qId of allQuestionIds) {
    const localQ = localMap.get(qId);
    const serverQ = serverMap.get(qId);

    if (localQ && !serverQ) {
      // Question exists locally, not on server
      const removed =
        context.baseDefinition?.questions.some((q) => q.id === qId) ?? false;
      if (removed) removedOnServer++;
      else addedLocally++;
      questionDiffs.push({
        questionId: qId,
        label: localQ.label,
        status: removed ? "removed_on_server" : "added_locally",
        changes: [
          {
            property: "status",
            localValue: `Added: "${localQ.label}" (${localQ.type})`,
            serverValue: "Not present on server",
          },
        ],
      });
    } else if (!localQ && serverQ) {
      // Question exists on server, deleted locally or added on server
      const removed =
        context.baseDefinition?.questions.some((q) => q.id === qId) ?? false;
      if (removed) removedLocally++;
      else addedOnServer++;
      questionDiffs.push({
        questionId: qId,
        label: serverQ.label,
        status: removed ? "removed_locally" : "added_on_server",
        changes: [
          {
            property: "status",
            localValue: "Not present locally",
            serverValue: `Server field: "${serverQ.label}" (${serverQ.type})`,
          },
        ],
      });
    } else if (localQ && serverQ) {
      // Exists in both: compare properties
      const changes: PropertyChange[] = [];

      if (localQ.label !== serverQ.label) {
        changes.push({
          property: "label",
          localValue: localQ.label,
          serverValue: serverQ.label,
        });
      }

      if (localQ.type !== serverQ.type) {
        changes.push({
          property: "type",
          localValue: localQ.type,
          serverValue: serverQ.type,
        });
      }

      if (localQ.required !== serverQ.required) {
        changes.push({
          property: "required",
          localValue: localQ.required ? "Required" : "Optional",
          serverValue: serverQ.required ? "Required" : "Optional",
        });
      }

      const localOptStr = stringifyOptions(localQ);
      const serverOptStr = stringifyOptions(serverQ);
      if (localOptStr !== serverOptStr) {
        changes.push({
          property: "choices",
          localValue: localOptStr,
          serverValue: serverOptStr,
        });
      }

      const localCondStr = stringifyCondition(localQ);
      const serverCondStr = stringifyCondition(serverQ);
      if (localCondStr !== serverCondStr) {
        changes.push({
          property: "condition",
          localValue: localCondStr,
          serverValue: serverCondStr,
        });
      }

      const properties = ["description", "placeholder", "validation"] as const;
      for (const property of properties) {
        const left: unknown = Reflect.get(localQ, property);
        const right: unknown = Reflect.get(serverQ, property);
        if (JSON.stringify(left) !== JSON.stringify(right))
          changes.push({
            property,
            localValue: JSON.stringify(left) ?? "",
            serverValue: JSON.stringify(right) ?? "",
          });
      }
      const localPosition = localDef.questions.findIndex((q) => q.id === qId);
      const serverPosition = serverDef.questions.findIndex((q) => q.id === qId);
      if (localPosition !== serverPosition)
        changes.push({
          property: "position",
          localValue: localPosition + 1,
          serverValue: serverPosition + 1,
        });

      if (changes.length > 0) {
        modified++;
        questionDiffs.push({
          questionId: qId,
          label: localQ.label,
          status: "modified",
          changes,
        });
      } else {
        questionDiffs.push({
          questionId: qId,
          label: localQ.label,
          status: "unchanged",
          changes: [],
        });
      }
    }
  }

  const hasTitleChange = localDef.title !== serverDef.title;
  const totalDifferences =
    addedLocally +
    addedOnServer +
    modified +
    removedLocally +
    removedOnServer +
    (hasTitleChange ? 1 : 0) +
    metadataChanges.length;

  return {
    localRevision,
    serverRevision,
    hasTitleChange,
    localTitle: localDef.title,
    serverTitle: serverDef.title,
    questionDiffs,
    metadataChanges,
    summary: {
      addedLocally,
      addedOnServer,
      modified,
      removedLocally,
      removedOnServer,
      totalDifferences,
    },
  };
}
