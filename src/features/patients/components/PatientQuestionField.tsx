import { useId, memo } from "react";
import type { Question } from "@/features/forms/domain/types";
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
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 ${
        hasError
          ? "border-red-400 bg-red-50/20"
          : "border-intake-border bg-intake-surface shadow-2xs hover:border-intake-border-focus"
      }`}
    >
      {/* Question Header */}
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
            className={`text-sm py-2.5 px-3.5 rounded-xl ${
              hasError ? "border-red-400 focus:ring-red-400" : ""
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
            className={`text-sm py-2.5 px-3.5 rounded-xl ${
              hasError ? "border-red-400 focus:ring-red-400" : ""
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
            className={`text-sm py-2.5 px-3.5 rounded-xl ${
              hasError ? "border-red-400 focus:ring-red-400" : ""
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
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-colors min-h-touch-target select-none ${
              Boolean(value)
                ? "border-intake-border-focus bg-intake-surface font-semibold text-intake-text-primary ring-1 ring-intake-border-focus"
                : "border-intake-border bg-intake-surface hover:border-intake-border-focus text-intake-text-primary"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
            <span className="leading-snug">{question.label}</span>
          </label>
        )}
      </div>

      {/* Validation Error Message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
