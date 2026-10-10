"use client";
import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type { Question } from "../domain/types";
import type {
  CanonicalAnswer,
  PatientAnswers,
} from "@/features/patients/domain/types";

const fieldClass =
  "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-primary)] focus:border-[var(--theme-border-focus)] focus:ring-[var(--theme-focus-ring)]";

export function QuestionInput({
  question: q,
  answers,
  onAnswerChange,
}: {
  question: Question;
  answers: PatientAnswers;
  onAnswerChange: (id: string, value: CanonicalAnswer | undefined) => void;
}) {
  const value = answers[q.id];
  const id = `preview-${q.id}`;
  const help = q.description ? `${id}-help` : undefined;
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-[var(--theme-text-primary)] shadow-xs">
      {q.type === "single_select" || q.type === "multi_select" ? (
        <fieldset aria-describedby={help}>
          <legend className="text-sm font-semibold">
            {q.label}
            {q.required && " *"}
          </legend>
          {q.description && (
            <p
              id={`${id}-help`}
              className="mt-1 text-xs text-[var(--theme-text-secondary)]"
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
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--theme-border)] p-3 text-xs"
                >
                  <Input
                    className="accent-[var(--theme-primary-action)] focus:ring-[var(--theme-focus-ring)]"
                    type={q.type === "single_select" ? "radio" : "checkbox"}
                    name={id}
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
              aria-describedby={help}
              rows={3}
              className={fieldClass}
              value={typeof value === "string" ? value : ""}
              placeholder={q.placeholder}
              onChange={(event) => onAnswerChange(q.id, event.target.value)}
            />
          ) : q.type === "checkbox" ? (
            <Input
              id={id}
              aria-describedby={help}
              type="checkbox"
              checked={value === true}
              className="accent-[var(--theme-primary-action)]"
              onChange={(event) => onAnswerChange(q.id, event.target.checked)}
            />
          ) : (
            <Input
              id={id}
              aria-describedby={help}
              className={fieldClass}
              type={q.type === "number" ? "number" : "text"}
              value={
                typeof value === "number" || typeof value === "string"
                  ? value
                  : ""
              }
              placeholder={q.placeholder}
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
    </div>
  );
}
