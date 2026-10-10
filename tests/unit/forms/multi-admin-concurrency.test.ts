import { describe, expect, it, vi } from "vitest";
import { compareDrafts } from "@/features/forms/domain/draft-diff";
import type {
  FormDefinition,
  ShortTextQuestion,
  SingleSelectQuestion,
} from "@/features/forms/domain/types";

describe("Multi-Admin Conflict Recovery — Stable Question ID Comparison & CAS", () => {
  const baseQuestion1: SingleSelectQuestion = {
    id: "q_pancreatitis_01",
    type: "single_select",
    label: "Do you have a history of pancreatitis?",
    required: true,
    visibility: null,
    options: [
      { id: "opt_yes_01", label: "Yes" },
      { id: "opt_no_01", label: "No" },
    ],
  };

  const baseQuestion2: ShortTextQuestion = {
    id: "q_symptoms_02",
    type: "short_text",
    label: "Describe any current symptoms",
    required: false,
    visibility: {
      parentQuestionId: "q_pancreatitis_01",
      equalsOptionId: "opt_yes_01",
    },
    placeholder: "Enter details...",
  };

  const baseDefinition: FormDefinition = {
    schemaVersion: 1,
    title: "Weight Management Intake",
    description: "Clinical evaluation form",
    questions: [baseQuestion1, baseQuestion2],
  };

  it("identifies differences when two admins modify identical questions", () => {
    // Admin A (committed to server at rev 2)
    const serverDef: FormDefinition = {
      ...baseDefinition,
      questions: [
        {
          ...baseQuestion1,
          label:
            "Have you ever been diagnosed with acute or chronic pancreatitis?",
          required: true,
        },
        baseQuestion2,
      ],
    };

    // Admin B (local edits in browser against rev 1)
    const localDef: FormDefinition = {
      ...baseDefinition,
      questions: [
        {
          ...baseQuestion1,
          label: "Personal history of pancreatitis or pancreatic disorders?",
          required: false,
        },
        baseQuestion2,
      ],
    };

    const diff = compareDrafts(localDef, serverDef, 1, 2);

    expect(diff.localRevision).toBe(1);
    expect(diff.serverRevision).toBe(2);
    expect(diff.summary.modified).toBe(1);
    expect(diff.summary.addedLocally).toBe(0);
    expect(diff.summary.addedOnServer).toBe(0);

    const q1Diff = diff.questionDiffs.find(
      (d) => d.questionId === "q_pancreatitis_01",
    );
    expect(q1Diff).toBeDefined();
    expect(q1Diff?.status).toBe("modified");

    const labelChange = q1Diff?.changes.find((c) => c.property === "label");
    expect(labelChange?.localValue).toBe(
      "Personal history of pancreatitis or pancreatic disorders?",
    );
    expect(labelChange?.serverValue).toBe(
      "Have you ever been diagnosed with acute or chronic pancreatitis?",
    );

    const reqChange = q1Diff?.changes.find((c) => c.property === "required");
    expect(reqChange?.localValue).toBe("Optional");
    expect(reqChange?.serverValue).toBe("Required");
  });

  it("identifies differences when two admins modify completely different questions", () => {
    // Admin A modified Question 1 on server
    const serverDef: FormDefinition = {
      ...baseDefinition,
      questions: [
        {
          ...baseQuestion1,
          label: "Diagnosed with pancreatitis? (Server edit)",
        },
        baseQuestion2,
      ],
    };

    // Admin B modified Question 2 locally
    const localDef: FormDefinition = {
      ...baseDefinition,
      questions: [
        baseQuestion1,
        {
          ...baseQuestion2,
          label: "Detailed medical symptoms and medications (Local edit)",
          required: true,
        },
      ],
    };

    const diff = compareDrafts(localDef, serverDef, 1, 2);

    expect(diff.summary.modified).toBe(2);

    const q1Diff = diff.questionDiffs.find(
      (d) => d.questionId === "q_pancreatitis_01",
    );
    expect(q1Diff?.status).toBe("modified");
    expect(q1Diff?.changes[0]?.serverValue).toContain("Server edit");

    const q2Diff = diff.questionDiffs.find(
      (d) => d.questionId === "q_symptoms_02",
    );
    expect(q2Diff?.status).toBe("modified");
    expect(q2Diff?.changes[0]?.localValue).toContain("Local edit");
  });

  it("identifies added and deleted questions across concurrent admins", () => {
    const newServerQuestion: ShortTextQuestion = {
      id: "q_server_added_03",
      type: "short_text",
      label: "Current BMI or weight in lbs",
      required: true,
      visibility: null,
    };

    const newLocalQuestion: ShortTextQuestion = {
      id: "q_local_added_04",
      type: "short_text",
      label: "Primary Care Physician name",
      required: false,
      visibility: null,
    };

    // Server added Q3
    const serverDef: FormDefinition = {
      ...baseDefinition,
      questions: [baseQuestion1, baseQuestion2, newServerQuestion],
    };

    // Local added Q4 and deleted Q2
    const localDef: FormDefinition = {
      ...baseDefinition,
      questions: [baseQuestion1, newLocalQuestion],
    };

    const diff = compareDrafts(localDef, serverDef, 1, 2);

    expect(diff.summary.addedLocally).toBe(1);
    expect(diff.summary.addedOnServer).toBe(2); // Q2 exists on server not locally, Q3 added on server

    const localAdded = diff.questionDiffs.find(
      (d) => d.questionId === "q_local_added_04",
    );
    expect(localAdded?.status).toBe("added_locally");

    const serverAdded = diff.questionDiffs.find(
      (d) => d.questionId === "q_server_added_03",
    );
    expect(serverAdded?.status).toBe("added_on_server");
  });

  it("simulates CAS protocol preventing silent last-write-wins between concurrent admins", async () => {
    // Database state simulation
    let dbRevision = 1;
    let dbDefinition = { ...baseDefinition };

    const casUpdate = vi.fn(
      async (
        expectedRevision: number,
        newDefinition: FormDefinition,
      ): Promise<{
        success: boolean;
        newRevision?: number;
        currentRevision?: number;
      }> => {
        if (expectedRevision !== dbRevision) {
          return { success: false, currentRevision: dbRevision };
        }
        dbRevision++;
        dbDefinition = newDefinition;
        return { success: true, newRevision: dbRevision };
      },
    );

    // Admin A modifies Question 1 starting from rev 1
    const adminADef: FormDefinition = {
      ...baseDefinition,
      questions: [
        { ...baseQuestion1, label: "Admin A question" },
        baseQuestion2,
      ],
    };

    // Admin B modifies Question 2 starting from rev 1
    const adminBDef: FormDefinition = {
      ...baseDefinition,
      questions: [
        baseQuestion1,
        { ...baseQuestion2, label: "Admin B question" },
      ],
    };

    // 1. Admin A saves first against rev 1 -> succeeds
    const resultA = await casUpdate(1, adminADef);
    expect(resultA.success).toBe(true);
    expect(resultA.newRevision).toBe(2);
    expect(dbRevision).toBe(2);

    // 2. Admin B attempts to save against rev 1 -> rejected with conflict
    const resultB = await casUpdate(1, adminBDef);
    expect(resultB.success).toBe(false);
    expect(resultB.currentRevision).toBe(2);

    // 3. Admin B compares local changes against server state (rev 2)
    const diff = compareDrafts(
      adminBDef,
      dbDefinition,
      1,
      resultB.currentRevision!,
    );
    expect(diff.summary.modified).toBe(2); // Both Q1 and Q2 differ

    // 4. Admin B explicitly resolves conflict by force saving using CAS against rev 2
    const resultBResolved = await casUpdate(2, adminBDef);
    expect(resultBResolved.success).toBe(true);
    expect(resultBResolved.newRevision).toBe(3);
    expect(dbRevision).toBe(3);

    // 5. If Admin C tries to save with stale rev 2, it is safely rejected (no silent overwrite)
    const resultC = await casUpdate(2, adminADef);
    expect(resultC.success).toBe(false);
    expect(resultC.currentRevision).toBe(3);
  });
});
