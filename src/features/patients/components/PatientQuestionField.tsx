import { Text } from "@/components/ui/text";
import { useId, useCallback, memo } from "react";
import type { Question } from "@/features/forms/domain/types";
import type { CanonicalAnswer } from "@/features/patients/domain/types";
import { AlertTriangleIcon } from "@/components/ui/icons";
import {
  QuestionControl,
  getFieldDescribedBy,
} from "@/features/forms/components/QuestionControl";

interface PatientQuestionFieldProps {
  question: Question;
  index: number;
  value: CanonicalAnswer | undefined;
  onAnswerChange: (
    questionId: string,
    value: CanonicalAnswer | undefined,
  ) => void;
  error?: string;
  disabled?: boolean;
}

export const PatientQuestionField = memo(function PatientQuestionField({
  question,
  index,
  value,
  onAnswerChange,
  error,
  disabled = false,
}: PatientQuestionFieldProps) {
  const generatedId = useId();
  const inputId = `patient-field-${question.id}-${generatedId}`;
  const errorId = `patient-error-${question.id}-${generatedId}`;
  const descId = `patient-desc-${question.id}-${generatedId}`;

  const handleFieldChange = useCallback(
    (nextValue: CanonicalAnswer | undefined) => {
      onAnswerChange(question.id, nextValue);
    },
    [onAnswerChange, question.id],
  );

  const hasError = Boolean(error);
  const describedBy = getFieldDescribedBy(
    question.description ? descId : undefined,
    hasError ? errorId : undefined,
  );

  return (
    <div
      data-question-id={question.id}
      className={
        question.type === "checkbox"
          ? "px-4 sm:px-5 py-2"
          : `p-4 sm:p-5 rounded-2xl border transition-all duration-150 ${
              hasError
                ? "border-intake-error-border bg-intake-error-bg"
                : "border-intake-border bg-intake-surface shadow-2xs hover:border-intake-border-focus"
            }`
      }
    >
      {/* Question Header */}
      {question.type !== "checkbox" && (
        <div className="mb-3">
          <label
            htmlFor={
              question.type !== "single_select" &&
              question.type !== "multi_select"
                ? inputId
                : undefined
            }
            className="block text-sm font-semibold text-intake-text-primary leading-snug"
          >
            <span className="mr-1.5">
              <Text variant="small" tone="intakeSecondary" mono weight="normal">
                {index + 1}.
              </Text>
            </span>
            {question.label}
            {question.required && (
              <span className="ml-1">
                <Text
                  aria-hidden="true"

                  variant="inherit"
                  tone="danger"
                  weight="bold"
                >
                  *
                </Text>
              </span>
            )}
            {question.required && <span className="sr-only"> (required)</span>}
          </label>

          {question.description && (
            <div className="mt-1">
              <Text id={descId} as="p" variant="small" tone="intakeSecondary">
                {question.description}
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Field Input per Type */}
      <div className="mt-2">
        <QuestionControl
          question={question}
          id={inputId}
          value={value}
          onChange={handleFieldChange}
          error={error}
          disabled={disabled}
          ariaDescribedBy={describedBy}
          rows={4}
          checkboxLabel={
            <Text variant="inherit">
              <span className="mr-1.5">
                <Text
                  variant="small"
                  tone="intakeSecondary"
                  mono
                  weight="normal"
                >
                  {index + 1}.
                </Text>
              </span>
              {question.label}
              {question.required && (
                <span className="ml-1">
                  <Text
                    aria-hidden="true"

                    variant="inherit"
                    tone="danger"
                    weight="bold"
                  >
                    *
                  </Text>
                </span>
              )}
              {question.required && (
                <span className="sr-only"> (required)</span>
              )}
            </Text>
          }
        />
      </div>

      {question.type === "checkbox" && question.description && (
        <div className="mt-1">
          <Text id={descId} as="p" variant="small" tone="intakeSecondary">
            {question.description}
          </Text>
        </div>
      )}

      {/* Validation Error Message */}
      {hasError && (
        <div className="mt-2 flex items-center gap-1">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          <Text
            id={errorId}
            role="alert"
            as="p"
            variant="small"
            tone="intakeError"
            weight="semibold"
          >
            <Text variant="inherit">{error}</Text>
          </Text>
        </div>
      )}
    </div>
  );
});
