import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "@/components/ui/input";
import { QuestionInput } from "@/features/forms/components/QuestionInput";
import { PatientQuestionField } from "@/features/patients/components/PatientQuestionField";
import { isQuestionAnswered } from "@/features/patients/domain/validation";
import type { Question } from "@/features/forms/domain/types";

describe("Preview controls", () => {
  it("renders a native select with an inset decorative arrow", () => {
    const html = renderToStaticMarkup(
      createElement(
        Select,
        { id: "theme" },
        createElement("option", null, "Ocean"),
      ),
    );
    expect(html).toContain('id="theme"');
    expect(html).toContain("appearance-none pr-9");
    expect(html).toContain("pointer-events-none");
    expect(html).toContain('aria-hidden="true"');
  });

  it.each([
    "short_text",
    "long_text",
    "number",
    "checkbox",
    "single_select",
    "multi_select",
  ] as const)("uses one red required marker for %s", (type) => {
    const question = {
      id: "required-question",
      type,
      label: "Required question",
      required: true,
      visibility: null,
      ...(type === "single_select" || type === "multi_select"
        ? {
            options: [
              { id: "one", label: "One" },
              { id: "two", label: "Two" },
            ],
          }
        : {}),
    } as Question;
    const html = renderToStaticMarkup(
      createElement(QuestionInput, {
        question,
        answers: {},
        onAnswerChange: () => {},
      }),
    );
    expect(
      html.match(/<span class="ml-1 text-red-600">\*<\/span>/g),
    ).toHaveLength(1);
    expect(html).not.toContain("Required question *");
  });

  describe("Preview and Patient Intake Agreement", () => {
    it.each([
      { type: "short_text" as const, placeholder: "Enter legal name here" },
      { type: "long_text" as const, placeholder: "Describe your symptoms" },
      { type: "number" as const, placeholder: "42" },
    ])(
      "both preview and patient intake respect configured placeholder for $type",
      ({ type, placeholder }) => {
        const question: Question = {
          id: `q_${type}`,
          type,
          label: "Sample question",
          placeholder,
          required: false,
          visibility: null,
        };

        const previewHtml = renderToStaticMarkup(
          createElement(QuestionInput, {
            question,
            answers: {},
            onAnswerChange: () => {},
          }),
        );
        const patientHtml = renderToStaticMarkup(
          createElement(PatientQuestionField, {
            question,
            index: 0,
            value: undefined,
            onChange: () => {},
          }),
        );

        expect(previewHtml).toContain(`placeholder="${placeholder}"`);
        expect(patientHtml).toContain(`placeholder="${placeholder}"`);
      },
    );

    it.each([
      { type: "short_text" as const, maxLength: 50 },
      { type: "long_text" as const, maxLength: 500 },
    ])(
      "both preview and patient intake enforce maxLength for $type",
      ({ type, maxLength }) => {
        const question: Question = {
          id: `q_${type}`,
          type,
          label: "Sample question",
          required: false,
          visibility: null,
          validation: { maxLength },
        };

        const previewHtml = renderToStaticMarkup(
          createElement(QuestionInput, {
            question,
            answers: {},
            onAnswerChange: () => {},
          }),
        );
        const patientHtml = renderToStaticMarkup(
          createElement(PatientQuestionField, {
            question,
            index: 0,
            value: undefined,
            onChange: () => {},
          }),
        );

        expect(previewHtml).toMatch(
          new RegExp(`maxlength="${maxLength}"`, "i"),
        );
        expect(patientHtml).toMatch(
          new RegExp(`maxlength="${maxLength}"`, "i"),
        );
      },
    );

    it("both preview and patient intake maintain both description and error IDs in aria-describedby", () => {
      const question: Question = {
        id: "q_text",
        type: "short_text",
        label: "Medical History",
        description: "List any prior diagnoses",
        required: true,
        visibility: null,
      };

      const previewHtml = renderToStaticMarkup(
        createElement(QuestionInput, {
          question,
          answers: {},
          onAnswerChange: () => {},
          error: "History is required",
        }),
      );
      const patientHtml = renderToStaticMarkup(
        createElement(PatientQuestionField, {
          question,
          index: 0,
          value: "",
          onChange: () => {},
          error: "History is required",
        }),
      );

      // In preview: help is "preview-q_text-help", error is "preview-q_text-error"
      expect(previewHtml).toContain(
        'aria-describedby="preview-q_text-help preview-q_text-error"',
      );

      // In patient: matches pattern containing both descId and errorId in aria-describedby
      const patientDescribedByMatch = patientHtml.match(
        /aria-describedby="([^"]+)"/,
      );
      expect(patientDescribedByMatch).toBeTruthy();
      const describedByIds = (patientDescribedByMatch?.[1] ?? "").split(" ");
      expect(describedByIds).toHaveLength(2);
      expect(describedByIds[0]).toContain("patient-desc-q_text");
      expect(describedByIds[1]).toContain("patient-error-q_text");
    });

    it("correctly treats checked-then-unchecked required consent as unanswered", () => {
      const consentQuestion: Question = {
        id: "q_consent",
        type: "checkbox",
        label: "I agree to telehealth treatment",
        required: true,
        visibility: null,
      };

      // Initially unanswered (undefined)
      expect(isQuestionAnswered(consentQuestion, undefined)).toBe(false);

      // Patient checks the box
      expect(isQuestionAnswered(consentQuestion, true)).toBe(true);

      // Patient unchecks the box (value becomes false)
      expect(isQuestionAnswered(consentQuestion, false)).toBe(false);

      // Verify questions filtering behavior
      const questions = [consentQuestion];
      const uncheckedAnswers = { q_consent: false };

      const answeredQuestions = questions.filter((q) =>
        isQuestionAnswered(
          q,
          uncheckedAnswers[q.id as keyof typeof uncheckedAnswers],
        ),
      );
      const unansweredRequired = questions.filter(
        (q) =>
          q.required &&
          !isQuestionAnswered(
            q,
            uncheckedAnswers[q.id as keyof typeof uncheckedAnswers],
          ),
      );

      // Progress cannot reach 100% with false consent
      expect(answeredQuestions).toHaveLength(0);
      // Next Required navigation properly surfaces missing consent
      expect(unansweredRequired).toHaveLength(1);
      expect(unansweredRequired[0]?.id).toBe("q_consent");
    });
  });
});
