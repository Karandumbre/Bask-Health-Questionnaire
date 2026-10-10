import { describe, it, expect } from "vitest";
import { Question } from "@/features/forms/domain/types";
import {
  evaluateQuestionVisibility,
  getVisibleQuestions,
  pruneHiddenAnswers,
} from "@/features/patients/domain/visibility";
import { PatientAnswers } from "@/features/patients/domain/types";

describe("Patient Visibility & Hidden Answer Pruning", () => {
  const sampleQuestions: Question[] = [
    {
      id: "q1",
      type: "single_select",
      label: "Do you have allergies?",
      required: true,
      visibility: null,
      options: [
        { id: "opt-yes", label: "Yes" },
        { id: "opt-no", label: "No" },
      ],
    },
    {
      id: "q2",
      type: "short_text",
      label: "List your allergies",
      required: true,
      visibility: { parentQuestionId: "q1", equalsOptionId: "opt-yes" },
    },
    {
      id: "q3",
      type: "short_text",
      label: "Emergency Contact",
      required: true,
      visibility: null,
    },
  ];

  it("evaluates visibility correctly based on parent selection", () => {
    const questionMap = new Map(sampleQuestions.map((q) => [q.id, q]));
    const q2 = sampleQuestions[1]!;

    // When parent is unanswered -> hidden
    expect(evaluateQuestionVisibility(q2, {}, questionMap)).toBe(false);

    // When parent is "No" -> hidden
    expect(evaluateQuestionVisibility(q2, { q1: "opt-no" }, questionMap)).toBe(false);

    // When parent is "Yes" -> visible
    expect(evaluateQuestionVisibility(q2, { q1: "opt-yes" }, questionMap)).toBe(true);
  });

  it("returns only visible questions in getVisibleQuestions", () => {
    const visibleWithNo = getVisibleQuestions(sampleQuestions, { q1: "opt-no" });
    expect(visibleWithNo.map((q) => q.id)).toEqual(["q1", "q3"]);

    const visibleWithYes = getVisibleQuestions(sampleQuestions, { q1: "opt-yes" });
    expect(visibleWithYes.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("prunes answers for newly hidden fields when parent switches from Yes to No", () => {
    // Patient previously answered Yes and typed allergies
    const initialAnswers: PatientAnswers = {
      q1: "opt-yes",
      q2: "Peanuts, Penicillin",
      q3: "Jane Doe (555-0199)",
    };

    // Patient changes parent to No
    const modifiedAnswers: PatientAnswers = {
      ...initialAnswers,
      q1: "opt-no",
    };

    const pruned = pruneHiddenAnswers(modifiedAnswers, sampleQuestions);

    // q2 MUST be removed immediately
    expect(pruned).toEqual({
      q1: "opt-no",
      q3: "Jane Doe (555-0199)",
    });
    expect(pruned["q2"]).toBeUndefined();
  });

  it("does not resurrect old answers if parent is toggled back to Yes", () => {
    // 1. Started with Yes and details
    const step1: PatientAnswers = {
      q1: "opt-yes",
      q2: "Peanuts",
      q3: "Contact Info",
    };

    // 2. Switched to No -> Prune executed
    const step2 = pruneHiddenAnswers({ ...step1, q1: "opt-no" }, sampleQuestions);
    expect(step2["q2"]).toBeUndefined();

    // 3. Switched back to Yes -> Pruned state still has no q2
    const step3 = pruneHiddenAnswers({ ...step2, q1: "opt-yes" }, sampleQuestions);
    expect(step3["q2"]).toBeUndefined();
    expect(step3["q1"]).toBe("opt-yes");
    expect(step3["q3"]).toBe("Contact Info");
  });

  it("prunes unknown questions that do not exist in the form definition", () => {
    const maliciousAnswers: PatientAnswers = {
      q1: "opt-yes",
      q2: "Peanuts",
      injected_field: "malicious_payload",
    };

    const pruned = pruneHiddenAnswers(maliciousAnswers, sampleQuestions);
    expect(pruned["injected_field"]).toBeUndefined();
  });
});

