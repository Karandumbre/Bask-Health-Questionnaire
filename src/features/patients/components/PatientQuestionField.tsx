import { useId, memo } from "react";
import type { Question } from "@/features/forms/domain/types";
import { COMPONENT_STYLES } from "@/design-system/component-styles";
import { Input, Textarea } from "@/components/ui/input";

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
        {question.type === "short_text" && (
          <Input
            id={inputId}
            type="text"
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer..."
            aria-required={question.required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : question.description ? descId : undefined
            }
            maxLength={question.validation?.maxLength}
            className={`${COMPONENT_STYLES.intakeField} text-sm py-2.5 px-3.5 rounded-xl ${
              hasError
                ? "border-intake-error-border focus:ring-intake-error-border"
                : ""
            }`}
          />
        )}

        {question.type === "long_text" && (
          <Textarea
            id={inputId}
            rows={4}
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your response here..."
            aria-required={question.required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : question.description ? descId : undefined
            }
            maxLength={question.validation?.maxLength}
            className={`${COMPONENT_STYLES.intakeField} text-sm py-2.5 px-3.5 rounded-xl ${
              hasError
                ? "border-intake-error-border focus:ring-intake-error-border"
                : ""
            }`}
          />
        )}

        {question.type === "number" && (
          <Input
            id={inputId}
            type="number"
            disabled={disabled}
            value={value !== null && value !== undefined ? String(value) : ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === "" ? null : Number(val));
            }}
            placeholder="0"
            min={question.validation?.min}
            max={question.validation?.max}
            step={question.validation?.integerOnly ? 1 : "any"}
            aria-required={question.required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : question.description ? descId : undefined
            }
            className={`${COMPONENT_STYLES.intakeField} text-sm py-2.5 px-3.5 rounded-xl ${
              hasError
                ? "border-intake-error-border focus:ring-intake-error-border"
                : ""
            }`}
          />
        )}

        {question.type === "single_select" && (
          <fieldset
            aria-required={question.required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : question.description ? descId : undefined
            }
            className="space-y-2"
          >
            <legend className="sr-only">{question.label}</legend>
            {question.options.map((opt) => {
              const isSelected = value === opt.id;
              const optionInputId = `${inputId}-opt-${opt.id}`;
              return (
                <label
                  key={opt.id}
                  htmlFor={optionInputId}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-colors min-h-touch-target select-none ${
                    isSelected
                      ? "border-intake-border-focus bg-intake-surface font-semibold text-intake-text-primary ring-1 ring-intake-border-focus"
                      : "border-intake-border bg-intake-surface hover:border-intake-border-focus text-intake-text-primary"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    id={optionInputId}
                    type="radio"
                    name={`radio-${question.id}`}
                    value={opt.id}
                    disabled={disabled}
                    checked={isSelected}
                    onChange={() => onChange(opt.id)}
                    className="h-4 w-4 accent-intake-primary-action cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        {question.type === "multi_select" && (
          <fieldset
            aria-required={question.required}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : question.description ? descId : undefined
            }
            className="space-y-2"
          >
            <legend className="sr-only">{question.label}</legend>
            {question.options.map((opt) => {
              const selectedArray = Array.isArray(value)
                ? (value as string[])
                : [];
              const isChecked = selectedArray.includes(opt.id);
              const optionInputId = `${inputId}-multi-${opt.id}`;
              return (
                <label
                  key={opt.id}
                  htmlFor={optionInputId}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-colors min-h-touch-target select-none ${
                    isChecked
                      ? "border-intake-border-focus bg-intake-surface font-semibold text-intake-text-primary ring-1 ring-intake-border-focus"
                      : "border-intake-border bg-intake-surface hover:border-intake-border-focus text-intake-text-primary"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    id={optionInputId}
                    type="checkbox"
                    value={opt.id}
                    disabled={disabled}
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selectedArray, opt.id]);
                      } else {
                        onChange(selectedArray.filter((id) => id !== opt.id));
                      }
                    }}
                    className="h-4 w-4 accent-intake-primary-action cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        {question.type === "checkbox" && (
          <label
            htmlFor={inputId}
            className={`flex items-start gap-3 text-xs sm:text-sm font-medium text-intake-text-primary cursor-pointer min-h-touch-target ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              id={inputId}
              type="checkbox"
              disabled={disabled}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              aria-required={question.required}
              aria-invalid={hasError}
              aria-describedby={
                hasError ? errorId : question.description ? descId : undefined
              }
              className="mt-0.5 h-4 w-4 accent-intake-primary-action cursor-pointer shrink-0"
            />
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
          </label>
        )}
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
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
