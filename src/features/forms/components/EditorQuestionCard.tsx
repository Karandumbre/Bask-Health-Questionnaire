"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Input, Textarea } from "@/components/ui/input";
import type { Question } from "../domain/types";
import { useBuilder } from "../context/builder-context";
import { QuestionActions } from "./QuestionActions";

export function EditorQuestionCard({
  question: q,
  index,
}: {
  question: Question;
  index: number;
}) {
  const { selectedQuestionId, selectQuestion } = useBuilder();
  const isSelected = q.id === selectedQuestionId;

  return (
    <div
      key={q.id}
      onClick={() => selectQuestion(q.id)}
      className={`relative rounded-xl border transition-all p-5 cursor-pointer bg-intake-surface ${
        isSelected
          ? "border-intake-border-focus shadow-md ring-2 ring-intake-focus-ring/20"
          : "hover:border-intake-border-focus border-intake-border shadow-2xs"
      }`}
    >
      {/* Top Header of Question Card */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="text-xs font-mono font-bold shrink-0 text-intake-text-secondary bg-intake-bg border border-intake-border px-2 py-0.5 rounded">
            #{index + 1}
          </span>
          <span className="text-sm font-semibold text-intake-text-primary">
            {q.label || (
              <span className="text-intake-text-secondary italic">
                {APP_MESSAGES.UNTITLED_QUESTION}
              </span>
            )}
            {q.required && (
              <span className="ml-1 text-red-500 font-bold" aria-hidden="true">
                *
              </span>
            )}
          </span>
        </div>

        {/* Quick Action Buttons on Selected Field */}
        {isSelected && <QuestionActions questionId={q.id} index={index} />}
      </div>

      {/* Description / Instructions */}
      {q.description && (
        <p className="text-xs text-intake-text-secondary mb-3 -mt-1">
          {q.description}
        </p>
      )}

      {/* Mock Input Controls */}
      <div className="pointer-events-none opacity-90">
        {q.type === "short_text" && (
          <Input
            type="text"
            readOnly
            placeholder={q.placeholder || APP_MESSAGES.SHORT_TEXT_RESPONSE}
            className="w-full text-xs bg-intake-bg border border-intake-border rounded-lg p-2.5 text-intake-text-secondary"
          />
        )}

        {q.type === "long_text" && (
          <Textarea
            readOnly
            rows={3}
            placeholder={
              q.placeholder || APP_MESSAGES.DETAILED_LONG_TEXT_RESPONSE
            }
            className="w-full text-xs bg-intake-bg border border-intake-border rounded-lg p-2.5 text-intake-text-secondary resize-none"
          />
        )}

        {q.type === "number" && (
          <Input
            type="number"
            readOnly
            placeholder={q.placeholder || "0"}
            className="w-48 text-xs bg-intake-bg border border-intake-border rounded-lg p-2.5 text-intake-text-secondary"
          />
        )}

        {q.type === "single_select" && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-intake-border bg-intake-bg text-xs text-intake-text-primary"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-intake-border bg-intake-surface" />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}

        {q.type === "multi_select" && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-intake-border bg-intake-bg text-xs text-intake-text-primary"
              >
                <div className="w-3.5 h-3.5 rounded border border-intake-border bg-intake-surface" />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}

        {q.type === "checkbox" && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-intake-border bg-intake-bg">
            <div className="w-4 h-4 rounded border border-intake-border bg-intake-surface mt-0.5" />
            <span className="text-xs text-intake-text-primary font-medium">
              {q.label}
            </span>
          </div>
        )}
      </div>

      {/* Condition Footer Indicator */}
      {q.visibility && (
        <div className="mt-3 pt-2.5 border-t border-intake-border flex items-center gap-1.5 text-caption text-intake-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-intake-primary-action" />
          <span>
            {
              APP_MESSAGES.CONDITIONAL_DISPLAYS_ONLY_WHEN_PARENT_CONDITION_IS_SATISFIED
            }
          </span>
        </div>
      )}
    </div>
  );
}
