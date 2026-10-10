"use client";

import { FormField } from "@/components/ui/form-field";
import type { Question } from "../domain/types";
import type {
  CanonicalAnswer,
  PatientAnswers,
} from "@/features/patients/domain/types";
import { QuestionControl, getFieldDescribedBy } from "./QuestionControl";

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
  const helpId = q.description ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = getFieldDescribedBy({
    descriptionId: helpId,
    errorId,
    hasDescription: Boolean(q.description),
    hasError: Boolean(error),
  });

  return (
    <div
      data-question-id={q.id}
      className={
        q.type === "checkbox"
          ? "px-5 py-2 text-intake-text-primary"
          : `rounded-xl border bg-intake-surface p-5 text-intake-text-primary shadow-xs ${error ? "border-intake-error-border" : "border-intake-border"}`
      }
    >
      {q.type === "single_select" || q.type === "multi_select" ? (
        <div>
          <QuestionControl
            question={q}
            id={id}
            value={value}
            onChange={(val) =>
              onAnswerChange(q.id, val as CanonicalAnswer | undefined)
            }
            error={error}
            ariaDescribedBy={describedBy}
            legend={q.label}
            legendSrOnly={false}
          />
          {q.description && (
            <p id={helpId} className="mt-1 text-xs text-intake-text-secondary">
              {q.description}
            </p>
          )}
        </div>
      ) : q.type === "checkbox" ? (
        <div>
          <QuestionControl
            question={q}
            id={id}
            value={value}
            onChange={(val) =>
              onAnswerChange(q.id, val as CanonicalAnswer | undefined)
            }
            error={error}
            ariaDescribedBy={describedBy}
          />
          {q.description && (
            <p id={helpId} className="mt-1 text-xs text-intake-text-secondary">
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
          <QuestionControl
            question={q}
            id={id}
            value={value}
            onChange={(val) =>
              onAnswerChange(q.id, val as CanonicalAnswer | undefined)
            }
            error={error}
            ariaDescribedBy={describedBy}
          />
        </FormField>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-semibold text-intake-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
