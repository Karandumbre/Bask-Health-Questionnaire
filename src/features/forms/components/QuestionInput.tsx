"use client";

import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type { Question } from "../domain/types";
import type {
  CanonicalAnswer,
  PatientAnswers,
} from "@/features/patients/domain/types";

const fieldClass =
  "border-intake-border bg-intake-surface text-intake-text-primary focus:border-intake-border-focus focus:ring-intake-focus-ring";

export function QuestionInput({
  question: q,
  answers,
  onAnswerChange,
  error,
}: {
  question: Question;
  error?: string;
  answers: PatientAnswers;
  onAnswerChange: (id: string, value: CanonicalAnswer | undefined) => void;
}) {
  const value = answers[q.id];
  const id = `preview-${q.id}`;
  const help = q.description ? `${id}-help` : undefined;
  const describedBy =
    [help, error ? `${id}-error` : undefined].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div
      data-question-id={q.id}
      className={`rounded-xl border bg-intake-surface p-5 text-intake-text-primary shadow-xs ${error ? "border-intake-error-border" : "border-intake-border"}`}
    >
      {q.type === "single_select" || q.type === "multi_select" ? (
        <fieldset aria-describedby={describedBy} aria-invalid={Boolean(error)}>
          <legend className="text-sm font-semibold">
            {q.label}
            {q.required && <span className="ml-1 text-red-600">*</span>}
          </legend>
          {q.description && (
            <p
              id={`${id}-help`}
              className="mt-1 text-xs text-intake-text-secondary"
            >
              {q.description}
            </p>
          )}
          <div className="mt-3 space-y-2">
            {q.options.map((option) => {
              const selected =
                q.type === "single_select"
                  ? value === option.id
                  : Array.isArray(value) && value.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-intake-border p-3 text-xs"
                >
                  <Input
                    className="accent-intake-primary-action focus:ring-intake-focus-ring"
                    type={q.type === "single_select" ? "radio" : "checkbox"}
                    name={id}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error)}
                    checked={selected}
                    onChange={() => {
                      if (q.type === "single_select")
                        onAnswerChange(q.id, option.id);
                      else {
                        const current = Array.isArray(value) ? value : [];
                        onAnswerChange(
                          q.id,
                          selected
                            ? current.filter((item) => item !== option.id)
                            : [...current, option.id],
                        );
                      }
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : q.type === "checkbox" ? (
        <div>
          <label
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 text-xs font-semibold"
          >
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={Boolean(error)}
              aria-required={q.required}
              type="checkbox"
              checked={value === true}
              className="mt-0.5 shrink-0 accent-intake-primary-action focus:ring-intake-focus-ring"
              onChange={(event) => onAnswerChange(q.id, event.target.checked)}
            />
            <span>
              {q.label}
              {q.required && <span className="ml-1 text-red-600">*</span>}
            </span>
          </label>
          {q.description && (
            <p id={help} className="mt-1 text-xs text-intake-text-secondary">
              {q.description}
            </p>
          )}
        </div>
      ) : (
        <FormField
          id={id}
          label={q.label}
          description={q.description}
          required={q.required}
        >
          {q.type === "long_text" ? (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              aria-invalid={Boolean(error)}
              rows={3}
              className={fieldClass}
              value={typeof value === "string" ? value : ""}
              placeholder={q.placeholder}
              onChange={(event) => onAnswerChange(q.id, event.target.value)}
            />
          ) : (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={Boolean(error)}
              className={fieldClass}
              type={q.type === "number" ? "number" : "text"}
              value={
                typeof value === "number" || typeof value === "string"
                  ? value
                  : ""
              }
              placeholder={q.placeholder}
              min={q.type === "number" ? q.validation?.min : undefined}
              max={q.type === "number" ? q.validation?.max : undefined}
              step={
                q.type === "number" && q.validation?.integerOnly ? 1 : "any"
              }
              onChange={(event) =>
                onAnswerChange(
                  q.id,
                  q.type === "number"
                    ? event.target.value === ""
                      ? undefined
                      : Number(event.target.value)
                    : event.target.value,
                )
              }
            />
          )}
        </FormField>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-xs font-semibold text-intake-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
