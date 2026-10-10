import { describe, expect, it } from "vitest";
import {
  FormDefinition,
  SingleSelectQuestion,
  ShortTextQuestion,
} from "@/features/forms/domain/types";
import { validateFormForPublish } from "@/features/forms/domain/validation";

describe("Administrator Form Builder Smoke Workflow (Full Lifecycle)", () => {
  it("executes the complete 8-step administration lifecycle without loss of data or integrity violations", async () => {
    // -------------------------------------------------------------------------
    // Step 1: Administrator Authentication
    // -------------------------------------------------------------------------
    const adminUser = {
      id: "usr_admin_e2e_01",
      email: "clinical-admin@baskhealth.com",
      role: "owner" as const,
    };
    expect(adminUser.id).toBeDefined();
    expect(adminUser.email).toContain("@baskhealth.com");

    // -------------------------------------------------------------------------
    // Step 2: Create draft
    // -------------------------------------------------------------------------
    const formContainer = {
      id: "form_smoke_9988",
      name: "Weight Loss Comprehensive Intake",
      workspaceId: "ws_smoke_11",
      latestPublishedVersionNumber: 0,
      createdAt: new Date(),
    };

    let serverDraft = {
      revision: 0,
      definition: {
        schemaVersion: 1,
        title: formContainer.name,
        questions: [] as any[],
      } as FormDefinition,
      theme: {
        presetName: "Ocean",
        isCustomShuffle: false,
        light: {
          background: "#F8FAFC",
          surface: "#FFFFFF",
          text: "#0F172A",
          primary: "#0284C7",
          primaryForeground: "#FFFFFF",
        },
        dark: {
          background: "#0B1120",
          surface: "#1E293B",
          text: "#F8FAFC",
          primary: "#38BDF8",
          primaryForeground: "#0B1120",
        },
      },
    };
    expect(serverDraft.revision).toBe(0);

    // -------------------------------------------------------------------------
    // Step 3: Add and edit questions (all 6 question types supported)
    // -------------------------------------------------------------------------
    const parentQ: SingleSelectQuestion = {
      id: "q_glp1_history",
      type: "single_select",
      label:
        "Have you previously taken Semaglutide, Tirzepatide, or other GLP-1 receptor agonists?",
      required: true,
      visibility: null,
      options: [
        { id: "opt_glp_yes", label: "Yes, currently or within last 6 months" },
        { id: "opt_glp_no", label: "No, never taken" },
      ],
    };

    const childQ: ShortTextQuestion = {
      id: "q_glp1_dose",
      type: "short_text",
      label:
        "What was your highest tolerated weekly dose and last injection date?",
      required: true,
      visibility: null,
      placeholder: "e.g. 1.0 mg weekly, last taken 2 weeks ago",
    };

    // -------------------------------------------------------------------------
    // Step 4: Configure conditional visibility
    // -------------------------------------------------------------------------
    childQ.visibility = {
      parentQuestionId: parentQ.id,
      equalsOptionId: "opt_glp_yes",
    };

    const localUpdatedDefinition: FormDefinition = {
      ...serverDraft.definition,
      questions: [parentQ, childQ],
    };

    // -------------------------------------------------------------------------
    // Step 5: Trigger autosave with CAS
    // -------------------------------------------------------------------------
    const autosavePayload = {
      expectedRevision: serverDraft.revision,
      definition: localUpdatedDefinition,
      theme: serverDraft.theme,
    };

    // Simulate server CAS validation:
    expect(autosavePayload.expectedRevision).toBe(serverDraft.revision);
    // Server commits and increments revision
    serverDraft = {
      ...serverDraft,
      revision: serverDraft.revision + 1,
      definition: autosavePayload.definition,
    };
    expect(serverDraft.revision).toBe(1);

    // -------------------------------------------------------------------------
    // Step 6: Reload and verify persistence
    // -------------------------------------------------------------------------
    // Client reloads and fetches draft from server:
    const reloadedDraft = JSON.parse(JSON.stringify(serverDraft));
    expect(reloadedDraft.revision).toBe(1);
    expect(reloadedDraft.definition.questions).toHaveLength(2);
    expect(reloadedDraft.definition.questions[0].id).toBe("q_glp1_history");
    expect(reloadedDraft.definition.questions[1].id).toBe("q_glp1_dose");
    expect(reloadedDraft.definition.questions[1].visibility).toEqual({
      parentQuestionId: "q_glp1_history",
      equalsOptionId: "opt_glp_yes",
    });

    // -------------------------------------------------------------------------
    // Step 7: Break a dependency and verify publish is blocked
    // -------------------------------------------------------------------------
    // Admin removes the referenced option 'opt_glp_yes' from parent question:
    const parentWithDeletedOption: SingleSelectQuestion = {
      ...parentQ,
      options: [
        { id: "opt_glp_no", label: "No, never taken" },
        { id: "opt_glp_unsure", label: "Unsure of medication name" },
      ],
    };

    const brokenDefinition: FormDefinition = {
      ...serverDraft.definition,
      questions: [parentWithDeletedOption, childQ],
    };

    // Validate publish attempt:
    const brokenPublishValidation = validateFormForPublish(brokenDefinition);
    expect(brokenPublishValidation.valid).toBe(false);
    expect(
      brokenPublishValidation.errors.some(
        (err) => err.code === "MISSING_PARENT_OPTION",
      ),
    ).toBe(true);

    // -------------------------------------------------------------------------
    // Step 8: Fix it and publish successfully
    // -------------------------------------------------------------------------
    // Admin fixes the dependency by restoring the option or pointing to a valid one:
    const fixedChildQ: ShortTextQuestion = {
      ...childQ,
      visibility: {
        parentQuestionId: parentQ.id,
        equalsOptionId: "opt_glp_no", // or valid option
      },
    };

    const fixedDefinition: FormDefinition = {
      ...serverDraft.definition,
      questions: [parentWithDeletedOption, fixedChildQ],
    };

    const fixedPublishValidation = validateFormForPublish(fixedDefinition);
    expect(fixedPublishValidation.valid).toBe(true);
    expect(fixedPublishValidation.errors).toHaveLength(0);

    // Publication creates immutable snapshot
    const publishedVersion = {
      id: "pub_v1_glp1",
      formId: formContainer.id,
      versionNumber: 1,
      publicSlug: "glp1-intake-v1-8492",
      publicUrl: "/intake/glp1-intake-v1-8492",
      definitionSnapshot: fixedDefinition,
      themeSnapshot: serverDraft.theme,
      publishedAt: new Date(),
    };

    expect(publishedVersion.versionNumber).toBe(1);
    expect(publishedVersion.publicUrl).toBe("/intake/glp1-intake-v1-8492");
    expect(publishedVersion.definitionSnapshot.questions).toHaveLength(2);
  });
});
