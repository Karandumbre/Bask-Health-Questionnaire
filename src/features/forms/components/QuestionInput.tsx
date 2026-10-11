"use client";

import { Text } from "@/components/ui/text";
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
  const describedBy = getFieldDescribedBy(helpId, errorId);

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
            onChange={(val) => onAnswerChange(q.id, val)}
            error={error}
            ariaDescribedBy={describedBy}
            legend={q.label}
            legendSrOnly={false}
          />
          {q.description && (
            <div className="mt-1">
              <Text id={helpId} as="p" variant="small" tone="intakeSecondary">
                {q.description}
              </Text>
            </div>
          )}
        </div>
      ) : q.type === "checkbox" ? (
        <div>
          <QuestionControl
            question={q}
            id={id}
            value={value}
            onChange={(val) => onAnswerChange(q.id, val)}
            error={error}
            ariaDescribedBy={describedBy}
          />
          {q.description && (
            <div className="mt-1">
              <Text id={helpId} as="p" variant="small" tone="intakeSecondary">
                {q.description}
              </Text>
            </div>
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
            onChange={(val) => onAnswerChange(q.id, val)}
            error={error}
            ariaDescribedBy={describedBy}
          />
        </FormField>
      )}

      {error && (
        <div className="mt-2">
          <Text
            id={errorId}
            role="alert"
            as="p"
            variant="small"
            tone="intakeError"
            weight="semibold"
          >
            {error}
          </Text>
        </div>
      )}
    </div>
  );
}
