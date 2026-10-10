import { describe, it, expect } from "vitest";
import { validateFormForDraft, validateFormForPublish } from "@/features/forms/domain/validation";
import { FormDefinition } from "@/features/forms/domain/types";

describe("validateFormForDraft", () => {
  it("returns field errors for malformed draft input", () => {
    const result = validateFormForDraft({
      title: 42,
      questions: [{ id: "", type: "short_text" }],
    });

    expect(result.valid).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toContain("title:");
    expect(result.error).toContain("questions.0.id: Question ID must not be empty");
  });

  it("fills defaults while preserving an incomplete authoring draft", () => {
    const result = validateFormForDraft({
      questions: [{ id: "q1", type: "single_select" }],
    });

    expect(result).toEqual({
      valid: true,
      data: {
        schemaVersion: 1,
        title: "Untitled Form",
        questions: [{
          id: "q1",
          type: "single_select",
          label: "",
          required: false,
          visibility: null,
          options: [],
        }],
      },
    });
  });
});

describe("validateFormForPublish", () => {
  it("rejects empty form title", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "   ",
      questions: [
        {
          id: "q1",
          type: "short_text",
          label: "Full Name",
          required: true,
          visibility: null,
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "EMPTY_TITLE" })
    );
  });

  it("rejects form with zero questions", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "NO_QUESTIONS" })
    );
  });

  it("rejects questions with blank labels", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "short_text",
          label: "  ",
          required: false,
          visibility: null,
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "EMPTY_QUESTION_LABEL", questionId: "q1" })
    );
  });

  it("rejects duplicate question IDs", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "short_text",
          label: "First Name",
          required: true,
          visibility: null,
        },
        {
          id: "q1",
          type: "short_text",
          label: "Last Name",
          required: true,
          visibility: null,
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_QUESTION_ID" })
    );
  });

  it("enforces text field minLength <= maxLength", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "short_text",
          label: "Postal Code",
          required: false,
          visibility: null,
          validation: { minLength: 10, maxLength: 5 },
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_LENGTH_RANGE" })
    );
  });

  it("enforces number min <= max and integer-only constraints", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "number",
          label: "Age",
          required: true,
          visibility: null,
          validation: { min: 100, max: 20 },
        },
        {
          id: "q2",
          type: "number",
          label: "Children",
          required: true,
          visibility: null,
          validation: { min: 1.5, integerOnly: true },
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INVALID_NUMBER_RANGE", questionId: "q1" })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "NON_INTEGER_BOUND", questionId: "q2" })
    );
  });

  it("requires select fields to have at least 2 distinct choices with non-blank labels", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "single_select",
          label: "Gender",
          required: true,
          visibility: null,
          options: [{ id: "opt1", label: "Male" }],
        },
        {
          id: "q2",
          type: "single_select",
          label: "Status",
          required: true,
          visibility: null,
          options: [
            { id: "o1", label: "Active" },
            { id: "o2", label: "active" }, // Duplicate normalized label
          ],
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "INSUFFICIENT_OPTIONS", questionId: "q1" })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_OPTION_LABEL", questionId: "q2" })
    );
  });

  it("rejects conditions referencing a non-existent parent question", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "short_text",
          label: "Details",
          required: false,
          visibility: { parentQuestionId: "missing-q", equalsOptionId: "opt-yes" },
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "MISSING_PARENT_QUESTION", questionId: "q1" })
    );
  });

  it("rejects forward conditions (parent placed after dependent question)", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "short_text",
          label: "Dependent Details",
          required: false,
          visibility: { parentQuestionId: "q2", equalsOptionId: "opt-yes" },
        },
        {
          id: "q2",
          type: "single_select",
          label: "Do you have allergies?",
          required: true,
          visibility: null,
          options: [
            { id: "opt-yes", label: "Yes" },
            { id: "opt-no", label: "No" },
          ],
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "FORWARD_OR_SELF_DEPENDENCY", questionId: "q1" })
    );
  });

  it("rejects conditions referencing an optional parent", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q1",
          type: "single_select",
          label: "Smoker?",
          required: false, // NOT required
          visibility: null,
          options: [
            { id: "opt-yes", label: "Yes" },
            { id: "opt-no", label: "No" },
          ],
        },
        {
          id: "q2",
          type: "short_text",
          label: "How many packs?",
          required: true,
          visibility: { parentQuestionId: "q1", equalsOptionId: "opt-yes" },
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "PARENT_NOT_REQUIRED", questionId: "q2" })
    );
  });

  it("rejects nested conditions (parent is itself conditional)", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Intake",
      questions: [
        {
          id: "q0",
          type: "single_select",
          label: "Root question",
          required: true,
          visibility: null,
          options: [
            { id: "opt-a", label: "A" },
            { id: "opt-b", label: "B" },
          ],
        },
        {
          id: "q1",
          type: "single_select",
          label: "Intermediate question",
          required: true,
          visibility: { parentQuestionId: "q0", equalsOptionId: "opt-a" },
          options: [
            { id: "opt-yes", label: "Yes" },
            { id: "opt-no", label: "No" },
          ],
        },
        {
          id: "q2",
          type: "short_text",
          label: "Leaf question",
          required: true,
          visibility: { parentQuestionId: "q1", equalsOptionId: "opt-yes" },
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "NESTED_CONDITION_FORBIDDEN", questionId: "q2" })
    );
  });

  it("accepts a completely valid form definition", () => {
    const form: FormDefinition = {
      schemaVersion: 1,
      title: "Clinical Intake",
      questions: [
        {
          id: "q1",
          type: "single_select",
          label: "Do you have pre-existing conditions?",
          required: true,
          visibility: null,
          options: [
            { id: "opt-yes", label: "Yes" },
            { id: "opt-no", label: "No" },
          ],
        },
        {
          id: "q2",
          type: "long_text",
          label: "Please specify conditions",
          required: true,
          visibility: { parentQuestionId: "q1", equalsOptionId: "opt-yes" },
        },
        {
          id: "q3",
          type: "number",
          label: "Current Age",
          required: true,
          visibility: null,
          validation: { min: 18, max: 120, integerOnly: true },
        },
      ],
    };
    const result = validateFormForPublish(form);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

