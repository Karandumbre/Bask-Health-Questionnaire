import { describe, it, expect } from "vitest";
import {
  validateQuestionCondition,
  getEligibleConditionParents,
} from "@/features/forms/domain/conditions";
import { compareDrafts } from "@/features/forms/domain/draft-diff";
import {
  getVisibleQuestions,
  pruneHiddenAnswers,
} from "@/features/patients/domain/visibility";
import {
  FormDefinitionSchema,
  type FormDefinition,
  type Question,
} from "@/features/forms/domain/types";
import {
  THEME_PRESET_OCEAN,
  THEME_PRESET_SLATE,
} from "@/features/themes/domain/theme-tokens";

const parent: Question = {
  id: "p",
  type: "single_select",
  label: "Parent",
  required: true,
  visibility: null,
  options: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
};
const child: Question = {
  id: "c",
  type: "short_text",
  label: "Details",
  required: false,
  visibility: { parentQuestionId: "p", equalsOptionId: "yes" },
};
const definition: FormDefinition = {
  schemaVersion: 1,
  title: "Form",
  questions: [parent, child],
};

describe("Shared condition and comparison rules", () => {
  it("uses the same condition rules for eligible parents and validation", () => {
    expect(getEligibleConditionParents(definition.questions, child.id)).toEqual(
      [parent],
    );
    expect(validateQuestionCondition(definition.questions, child)).toEqual([]);
    expect(validateQuestionCondition([child, parent], child)[0]?.code).toBe(
      "FORWARD_OR_SELF_DEPENDENCY",
    );
  });
  it("handles a non-select parent without assuming options exist", () => {
    const textParent: Question = { ...child, id: "p", visibility: null };
    expect(validateQuestionCondition([textParent, child], child)[0]?.code).toBe(
      "INVALID_PARENT_TYPE",
    );
    expect(getVisibleQuestions([textParent, child], { p: "yes" })).toEqual([
      textParent,
    ]);
  });
  it("fails closed on draft condition cycles instead of recursing forever", () => {
    const cyclicParent = {
      ...parent,
      visibility: { parentQuestionId: "c", equalsOptionId: "yes" },
    };
    expect(
      getVisibleQuestions([cyclicParent, child], { p: "yes", c: "yes" }),
    ).toEqual([]);
  });
  it("permits incomplete draft condition and option labels while retaining publish validation", () => {
    expect(
      FormDefinitionSchema.safeParse({
        ...definition,
        questions: [
          { ...parent, options: [{ id: "yes", label: "" }] },
          {
            ...child,
            visibility: { parentQuestionId: "", equalsOptionId: "" },
          },
        ],
      }).success,
    ).toBe(true);
  });
  it("prunes hidden answers immediately after a parent changes", () => {
    expect(
      pruneHiddenAnswers(
        { p: "no", c: "private detail" },
        definition.questions,
      ),
    ).toEqual({ p: "no" });
  });
  it("includes validation, placeholders, descriptions, option IDs, order and theme differences", () => {
    const changed: FormDefinition = {
      ...definition,
      description: "Changed",
      questions: [
        { ...child, placeholder: "Changed", validation: { maxLength: 10 } },
        {
          ...parent,
          type: "single_select",
          options: [
            { id: "new", label: "Yes" },
            { id: "no", label: "No" },
          ],
        },
      ],
    };
    const diff = compareDrafts(changed, definition, 1, 2, {
      localTheme: THEME_PRESET_SLATE,
      serverTheme: THEME_PRESET_OCEAN,
    });
    expect(diff.metadataChanges.map((change) => change.property)).toEqual([
      "description",
      "theme",
    ]);
    expect(
      diff.questionDiffs
        .find((question) => question.questionId === "c")
        ?.changes.map((change) => change.property),
    ).toEqual(
      expect.arrayContaining(["placeholder", "validation", "position"]),
    );
    expect(
      diff.questionDiffs
        .find((question) => question.questionId === "p")
        ?.changes.some((change) => change.property === "choices"),
    ).toBe(true);
  });
  it("identifies deletions only when a common base snapshot is available", () => {
    const local = { ...definition, questions: [parent] };
    expect(
      compareDrafts(local, definition, 1, 2, { baseDefinition: definition })
        .summary.removedLocally,
    ).toBe(1);
  });
});
