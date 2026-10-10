import { describe, it, expect } from "vitest";
import { Question } from "@/features/forms/domain/types";
import {
  validateSessionSubmission,
  validateSessionProgress,
} from "@/features/patients/domain/validation";
import { PatientAnswers } from "@/features/patients/domain/types";

describe("Patient Server-Side Validation", () => {
  const formQuestions: Question[] = [
    {
      id: "q_name",
      type: "short_text",
      label: "Full Legal Name",
      required: true,
      visibility: null,
      validation: { minLength: 2, maxLength: 50 },
    },
    {
      id: "q_age",
      type: "number",
      label: "Age in Years",
      required: true,
      visibility: null,
      validation: { min: 18, max: 120, integerOnly: true },
    },
    {
      id: "q_gender",
      type: "single_select",
      label: "Biological Sex",
      required: true,
      visibility: null,
      options: [
        { id: "opt_female", label: "Female" },
        { id: "opt_male", label: "Male" },
        { id: "opt_other", label: "Other" },
      ],
    },
    {
      id: "q_pregnant",
      type: "single_select",
      label: "Are you currently pregnant?",
      required: true,
      visibility: { parentQuestionId: "q_gender", equalsOptionId: "opt_female" },
      options: [
        { id: "opt_preg_yes", label: "Yes" },
        { id: "opt_preg_no", label: "No" },
      ],
    },
    {
      id: "q_symptoms",
      type: "multi_select",
      label: "Select all current symptoms",
      required: false,
      visibility: null,
      options: [
        { id: "opt_cough", label: "Cough" },
        { id: "opt_fever", label: "Fever" },
        { id: "opt_fatigue", label: "Fatigue" },
      ],
    },
    {
      id: "q_consent",
      type: "checkbox",
      label: "I consent to telehealth treatment",
      required: true,
      visibility: null,
    },
  ];

  describe("Final Submission Validation (Strict)", () => {
    it("rejects whitespace-only text in required text fields", () => {
      const answers: PatientAnswers = {
        q_name: "     ",
        q_age: 30,
        q_gender: "opt_male",
        q_consent: true,
      };

      const result = validateSessionSubmission(answers, formQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_name",
          code: "REQUIRED_TEXT_BLANK",
        })
      );
    });

    it("rejects text violating minLength", () => {
      const answers: PatientAnswers = {
        q_name: "A", // minLength is 2
        q_age: 30,
        q_gender: "opt_male",
        q_consent: true,
      };

      const result = validateSessionSubmission(answers, formQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_name",
          code: "MIN_LENGTH_VIOLATION",
        })
      );
    });

    it("rejects invalid, decimal, or out-of-bounds numbers", () => {
      // Decimal in integer-only
      const res1 = validateSessionSubmission(
        { q_name: "Alice", q_age: 25.5, q_gender: "opt_female", q_pregnant: "opt_preg_no", q_consent: true },
        formQuestions
      );
      expect(res1.valid).toBe(false);
      expect(res1.errors).toContainEqual(
        expect.objectContaining({ questionId: "q_age", code: "INTEGER_ONLY_VIOLATION" })
      );

      // Under minimum
      const res2 = validateSessionSubmission(
        { q_name: "Alice", q_age: 16, q_gender: "opt_female", q_pregnant: "opt_preg_no", q_consent: true },
        formQuestions
      );
      expect(res2.valid).toBe(false);
      expect(res2.errors).toContainEqual(
        expect.objectContaining({ questionId: "q_age", code: "MIN_VALUE_VIOLATION" })
      );
    });

    it("rejects required checkbox when false", () => {
      const answers: PatientAnswers = {
        q_name: "Bob Smith",
        q_age: 45,
        q_gender: "opt_male",
        q_consent: false,
      };

      const result = validateSessionSubmission(answers, formQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_consent",
          code: "REQUIRED_CHECKBOX_UNCHECKED",
        })
      );
    });

    it("rejects unknown single-select option IDs", () => {
      const answers: PatientAnswers = {
        q_name: "Bob Smith",
        q_age: 45,
        q_gender: "hacked_option_id",
        q_consent: true,
      };

      const result = validateSessionSubmission(answers, formQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_gender",
          code: "UNKNOWN_OPTION_ID",
        })
      );
    });

    it("rejects duplicate option IDs in multi-select", () => {
      const answers: PatientAnswers = {
        q_name: "Bob Smith",
        q_age: 45,
        q_gender: "opt_male",
        q_symptoms: ["opt_cough", "opt_cough"],
        q_consent: true,
      };

      const result = validateSessionSubmission(answers, formQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_symptoms",
          code: "DUPLICATE_SELECTION",
        })
      );
    });

    it("automatically removes hidden answers and passes valid submission", () => {
      // Patient is male, but malicious client sent answer for q_pregnant
      const answers: PatientAnswers = {
        q_name: "Bob Smith",
        q_age: 45,
        q_gender: "opt_male",
        q_pregnant: "opt_preg_yes", // HIDDEN! Should be pruned
        q_consent: true,
      };

      const result = validateSessionSubmission(answers, formQuestions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedAnswers["q_pregnant"]).toBeUndefined();
      expect(result.sanitizedAnswers["q_name"]).toBe("Bob Smith");
    });
  });

  describe("In-Progress Progress Validation (Permissive)", () => {
    it("allows missing required fields while intake is in-progress", () => {
      const partialAnswers: PatientAnswers = {
        q_name: "Alice",
      };

      const result = validateSessionProgress(partialAnswers, formQuestions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("still catches type corruption during progress save", () => {
      const badAnswers: PatientAnswers = {
        q_age: 1500, // exceeds max 120
      };

      const result = validateSessionProgress(badAnswers, formQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_age",
          code: "MAX_VALUE_VIOLATION",
        })
      );
    });
  });
});

