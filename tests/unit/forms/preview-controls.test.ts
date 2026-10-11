import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "@/components/ui/input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { QuestionInput } from "@/features/forms/components/QuestionInput";
import { getFieldDescribedBy } from "@/features/forms/components/QuestionControl";
import { PatientQuestionField } from "@/features/patients/components/PatientQuestionField";
import { RecoveryCodeModal } from "@/features/patients/components/RecoveryCodeModal";
import { FormRow } from "@/features/forms/components/FormRow";
import { FormCanvas } from "@/features/forms/components/FormCanvas";
import { BuilderProvider } from "@/features/forms/context/builder-context";
import { THEME_PRESET_EMERALD } from "@/features/themes/domain/presets";
import { isQuestionAnswered } from "@/features/patients/domain/validation";
import { APP_MESSAGES } from "@/lib/constants/messages";
import type { Question } from "@/features/forms/domain/types";
import type { FormListItem } from "@/features/forms/domain/dashboard-types";

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
            onAnswerChange: () => {},
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
            onAnswerChange: () => {},
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
          onAnswerChange: () => {},
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

    it("simplified getFieldDescribedBy handles combinations of IDs directly", () => {
      expect(getFieldDescribedBy("desc-1", "err-1")).toBe("desc-1 err-1");
      expect(getFieldDescribedBy("desc-1", undefined)).toBe("desc-1");
      expect(getFieldDescribedBy(undefined, "err-1")).toBe("err-1");
      expect(getFieldDescribedBy(undefined, undefined)).toBeUndefined();
      expect(getFieldDescribedBy(false, null)).toBeUndefined();
    });

    it("RecoveryCodeModal displays save error banner when saveError is provided", () => {
      const htmlWithError = renderToStaticMarkup(
        createElement(RecoveryCodeModal, {
          recoveryCode: "REC-123",
          isOpen: true,
          onClose: () => {},
          saveError: APP_MESSAGES.INTAKE_SAVE_FAILED,
        }),
      );
      expect(htmlWithError).toContain(APP_MESSAGES.INTAKE_SAVE_FAILED);

      const htmlWithoutError = renderToStaticMarkup(
        createElement(RecoveryCodeModal, {
          recoveryCode: "REC-123",
          isOpen: true,
          onClose: () => {},
          saveError: null,
        }),
      );
      expect(htmlWithoutError).not.toContain(APP_MESSAGES.INTAKE_SAVE_FAILED);
    });

    it("PatientQuestionField keeps fields editable during recoverable errors but disables on conflict/submission", () => {
      const question: Question = {
        id: "q_age",
        type: "number",
        label: "Age",
        required: true,
        visibility: null,
      };

      // Recoverable failure: disabled is false, input must NOT have disabled attribute so patient can correct it
      const editableHtml = renderToStaticMarkup(
        createElement(PatientQuestionField, {
          question,
          index: 0,
          value: 101,
          onAnswerChange: () => {},
          error: "Number cannot exceed 100",
          disabled: false,
        }),
      );
      expect(editableHtml).toContain('value="101"');
      expect(editableHtml).not.toMatch(/\sdisabled([=>\s])/i);

      // Conflict or session submission: disabled is true, input MUST have disabled attribute
      const disabledHtml = renderToStaticMarkup(
        createElement(PatientQuestionField, {
          question,
          index: 0,
          value: 101,
          onAnswerChange: () => {},
          disabled: true,
        }),
      );
      expect(disabledHtml).toMatch(/\sdisabled([=>\s])/i);
    });

    it("FormRow surfaces deployed intake link action for published forms and hides it for drafts", () => {
      const mockModel = {
        renamingFormId: null,
        renamingName: "",
        setRenamingName: () => {},
        setRenamingFormId: () => {},
        handleSaveRename: () => {},
        handleStartRename: () => {},
        handleDeleteForm: () => {},
        isMutating: false,
        pendingAction: null,
      } as any;

      const publishedForm: FormListItem = {
        id: "form-1",
        name: "ADHD Initial Screening",
        workspaceId: "ws-1",
        latestPublishedVersionNumber: 1,
        publicSlug: "adhd-initial-screening-v1-8492",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        draftRevision: 15,
        draftUpdatedAt: new Date().toISOString(),
      };

      const publishedRowHtml = renderToStaticMarkup(
        createElement(
          Table,
          null,
          createElement(
            Thead,
            null,
            createElement(
              Tr,
              null,
              createElement(Th, { className: "px-5" }, "Title"),
            ),
          ),
          createElement(
            Tbody,
            null,
            createElement(FormRow, { form: publishedForm, model: mockModel }),
          ),
        ),
      );

      // Must have "Copy Link" action button and live intake href
      expect(publishedRowHtml).toContain("Copy Link");
      expect(publishedRowHtml).toContain(
        'href="/intake/adhd-initial-screening-v1-8492"',
      );
      expect(publishedRowHtml).toContain("Published v1");

      const draftForm: FormListItem = {
        id: "form-2",
        name: "Draft Medical History",
        workspaceId: "ws-1",
        latestPublishedVersionNumber: null,
        publicSlug: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        draftRevision: 1,
        draftUpdatedAt: new Date().toISOString(),
      };

      const draftRowHtml = renderToStaticMarkup(
        createElement(
          Table,
          null,
          createElement(
            Tbody,
            null,
            createElement(FormRow, { form: draftForm, model: mockModel }),
          ),
        ),
      );

      // Must not show Copy Link button or deployed intake href
      expect(draftRowHtml).not.toContain("Copy Link");
      expect(draftRowHtml).not.toContain('href="/intake/');
      expect(draftRowHtml).toContain(APP_MESSAGES.UNPUBLISHED_DRAFT);

      const cellHtml = renderToStaticMarkup(
        createElement(
          Table,
          null,
          createElement(
            Tbody,
            null,
            createElement(
              Tr,
              null,
              createElement(Td, { className: "px-5 text-right" }, "Cell"),
            ),
          ),
        ),
      );
      expect(cellHtml).toContain("<table");
      expect(cellHtml).toContain("<td");
      expect(cellHtml).toContain("py-3.5 whitespace-nowrap px-5 text-right");
    });

    it("FormCanvas applies theme CSS variables and scoped intake tokens in Editor mode", () => {
      const html = renderToStaticMarkup(
        createElement(
          BuilderProvider,
          {
            formId: "form-theme-test",
            initialName: "Themed Intake",
            initialRevision: 1,
            initialTheme: THEME_PRESET_EMERALD,
            initialDefinition: {
              schemaVersion: 1,
              title: "Themed Intake",
              description: "Verify editor theme binding",
              questions: [
                {
                  id: "q1",
                  type: "short_text",
                  label: "First Name",
                  required: true,
                  visibility: null,
                },
              ],
            },
          },
          createElement(FormCanvas),
        ),
      );

      expect(html).toContain("data-patient-theme");
      expect(html).toContain('data-theme-mode="light"');
      expect(html).toContain(
        `--theme-primary-action:${THEME_PRESET_EMERALD.light.primaryAction}`,
      );
      expect(html).toContain("bg-intake-surface");
      expect(html).toContain("border-t-intake-primary-action");
    });

    it("PatientQuestionField accepts stable onAnswerChange prop for memoized 100-field rendering", () => {
      const question: Question = {
        id: "q_memo",
        type: "short_text",
        label: "Memoized Question",
        required: true,
        visibility: null,
      };
      const stableHandler = () => {};
      const html = renderToStaticMarkup(
        createElement(PatientQuestionField, {
          question,
          index: 0,
          value: "Initial",
          onAnswerChange: stableHandler,
        }),
      );
      expect(html).toContain('data-question-id="q_memo"');
      expect(html).toContain('value="Initial"');
    });
  });
});
