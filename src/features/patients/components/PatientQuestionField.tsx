import { useId, memo } from "react";
import type { Question } from "@/features/forms/domain/types";
import { AlertTriangleIcon } from "@/components/ui/icons";
import {
  QuestionControl,
  getFieldDescribedBy,
} from "@/features/forms/components/QuestionControl";

interface PatientQuestionFieldProps {
  question: Question;
  index: number;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export const PatientQuestionField = memo(function PatientQuestionField({
  question,
  index,
  value,
  onChange,
  error,
  disabled = false,
}: PatientQuestionFieldProps) {
  const generatedId = useId();
  const inputId = `patient-field-${question.id}-${generatedId}`;
  const errorId = `patient-error-${question.id}-${generatedId}`;
  const descId = `patient-desc-${question.id}-${generatedId}`;

  const hasError = Boolean(error);
  const describedBy = getFieldDescribedBy({
    descriptionId: descId,
    errorId,
    hasDescription: Boolean(question.description),
    hasError,
  });

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
            <span className="text-intake-text-secondary font-mono text-xs mr-1.5 font-normal">
              {index + 1}.
            </span>
            {question.label}
            {question.required && (
              <span className="text-red-500 ml-1 font-bold" aria-hidden="true">
                *
              </span>
            )}
            {question.required && <span className="sr-only"> (required)</span>}
          </label>

          {question.description && (
            <p id={descId} className="text-xs text-intake-text-secondary mt-1">
              {question.description}
            </p>
          )}
        </div>
      )}

      {/* Field Input per Type */}
      <div className="mt-2">
        <QuestionControl
          question={question}
          id={inputId}
          value={value}
          onChange={onChange}
          error={error}
          disabled={disabled}
          ariaDescribedBy={describedBy}
          rows={4}
          checkboxLabel={
            <span className="leading-snug">
              <span className="text-intake-text-secondary font-mono text-xs mr-1.5 font-normal">
                {index + 1}.
              </span>
              {question.label}
              {question.required && (
                <span
                  className="ml-1 font-bold text-red-500"
                  aria-hidden="true"
                >
                  *
                </span>
              )}
              {question.required && (
                <span className="sr-only"> (required)</span>
              )}
            </span>
          }
        />
      </div>

      {question.type === "checkbox" && question.description && (
        <p id={descId} className="mt-1 text-xs text-intake-text-secondary">
          {question.description}
        </p>
      )}

      {/* Validation Error Message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-semibold text-intake-error flex items-center gap-1"
        >
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
