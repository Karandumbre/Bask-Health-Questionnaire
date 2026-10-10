import { describe, expect, it } from "vitest";
import { threeWayMergeDrafts } from "@/features/forms/domain/three-way-merge";
import type {
  FormDefinition,
  SingleSelectQuestion,
  ShortTextQuestion,
} from "@/features/forms/domain/types";
import {
  THEME_PRESET_OCEAN,
  THEME_PRESET_EMERALD,
  THEME_PRESET_SLATE,
} from "@/features/themes/domain/theme-tokens";

describe("Three-Way Conflict Merging Engine", () => {
  const q1Base: ShortTextQuestion = {
    id: "q_name",
    type: "short_text",
    label: "Patient Full Name",
    required: true,
    visibility: null,
  };

  const q2Base: SingleSelectQuestion = {
    id: "q_condition",
    type: "single_select",
    label: "Do you have pre-existing conditions?",
    required: true,
    visibility: null,
    options: [
      { id: "opt_yes", label: "Yes" },
      { id: "opt_no", label: "No" },
    ],
  };

  const baseDef: FormDefinition = {
    schemaVersion: 1,
    title: "Clinical Intake",
    questions: [q1Base, q2Base],
  };

  it("1. automatically merges non-overlapping question edits without conflict", () => {
    // Local modifies q1 (label), leaves q2 alone
    const localDef: FormDefinition = {
      ...baseDef,
      questions: [{ ...q1Base, label: "Legal Full Name" }, q2Base],
    };

    // Server modifies q2 (adds option), leaves q1 alone
    const serverDef: FormDefinition = {
      ...baseDef,
      questions: [
        q1Base,
        {
          ...q2Base,
          options: [...q2Base.options, { id: "opt_unsure", label: "Unsure" }],
        },
      ],
    };

    const result = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: localDef,
      serverDefinition: serverDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_OCEAN,
      serverTheme: THEME_PRESET_OCEAN,
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.mergedDefinition.questions).toHaveLength(2);
    expect(result.mergedDefinition.questions[0]?.label).toBe("Legal Full Name");
    expect(
      (result.mergedDefinition.questions[1] as SingleSelectQuestion).options,
    ).toHaveLength(3);
    expect(result.summary.appliedLocalChanges).toHaveLength(1);
    expect(result.summary.appliedServerChanges).toHaveLength(1);
  });

  it("2. automatically merges non-overlapping additions from both administrators", () => {
    const q3Local: ShortTextQuestion = {
      id: "q_email",
      type: "short_text",
      label: "Email Address",
      required: false,
      visibility: null,
    };

    const q4Server: ShortTextQuestion = {
      id: "q_phone",
      type: "short_text",
      label: "Phone Number",
      required: false,
      visibility: null,
    };

    const localDef: FormDefinition = {
      ...baseDef,
      questions: [...baseDef.questions, q3Local],
    };

    const serverDef: FormDefinition = {
      ...baseDef,
      questions: [...baseDef.questions, q4Server],
    };

    const result = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: localDef,
      serverDefinition: serverDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_OCEAN,
      serverTheme: THEME_PRESET_OCEAN,
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.mergedDefinition.questions).toHaveLength(4);
    const ids = result.mergedDefinition.questions.map((q) => q.id);
    expect(ids).toContain("q_email");
    expect(ids).toContain("q_phone");
  });

  it("3. automatically merges clean non-overlapping deletions", () => {
    // Local deletes q2
    const localDef: FormDefinition = {
      ...baseDef,
      questions: [q1Base],
    };

    // Server leaves q2 alone
    const serverDef: FormDefinition = baseDef;

    const result = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: localDef,
      serverDefinition: serverDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_OCEAN,
      serverTheme: THEME_PRESET_OCEAN,
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.mergedDefinition.questions).toHaveLength(1);
    expect(result.mergedDefinition.questions[0]?.id).toBe("q_name");
  });

  it("4. detects conflict when both administrators modify the same property differently", () => {
    const localDef: FormDefinition = {
      ...baseDef,
      questions: [{ ...q1Base, label: "Full Legal Name" }, q2Base],
    };

    const serverDef: FormDefinition = {
      ...baseDef,
      questions: [{ ...q1Base, label: "Preferred Name" }, q2Base],
    };

    const result = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: localDef,
      serverDefinition: serverDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_OCEAN,
      serverTheme: THEME_PRESET_OCEAN,
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.type).toBe("property_collision");
    expect(result.conflicts[0]?.questionId).toBe("q_name");
  });

  it("5. detects delete vs modify collision", () => {
    // Local deletes q1
    const localDef: FormDefinition = {
      ...baseDef,
      questions: [q2Base],
    };

    // Server modifies q1
    const serverDef: FormDefinition = {
      ...baseDef,
      questions: [{ ...q1Base, label: "Server Modified Name" }, q2Base],
    };

    const result = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: localDef,
      serverDefinition: serverDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_OCEAN,
      serverTheme: THEME_PRESET_OCEAN,
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts[0]?.type).toBe("delete_vs_modify");
  });

  it("6. detects theme collision and resolves explicitly", () => {
    // Local selects Emerald, Server selects Slate
    const resultUnresolved = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: baseDef,
      serverDefinition: baseDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_EMERALD,
      serverTheme: THEME_PRESET_SLATE,
    });

    expect(resultUnresolved.hasConflicts).toBe(true);
    expect(resultUnresolved.conflicts[0]?.type).toBe("theme_collision");

    // Resolve by picking server theme
    const resultResolved = threeWayMergeDrafts({
      baseDefinition: baseDef,
      localDefinition: baseDef,
      serverDefinition: baseDef,
      baseTheme: THEME_PRESET_OCEAN,
      localTheme: THEME_PRESET_EMERALD,
      serverTheme: THEME_PRESET_SLATE,
      resolutions: {
        theme: "server",
      },
    });

    expect(resultResolved.mergedTheme.presetName).toBe("Slate");
  });
});
