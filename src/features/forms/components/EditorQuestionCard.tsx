"use client";
import { Text } from "@/components/ui/text";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Input, Textarea } from "@/components/ui/input";
import type { Question } from "../domain/types";
import { memo } from "react";
import { QuestionActions } from "./QuestionActions";

export const EditorQuestionCard = memo(function EditorQuestionCard({
  question: q,
  index,
  isSelected,
  selectQuestion,
}: {
  question: Question;
  index: number;
  isSelected: boolean;
  selectQuestion: (id: string) => void;
}) {
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
          <span className="shrink-0 bg-intake-bg border border-intake-border px-2 py-0.5 rounded">
            <Text variant="small" tone="intakeSecondary" mono weight="bold">
              #{index + 1}
            </Text>
          </span>
          <Text variant="body" tone="intake" weight="semibold">
            {q.label || (
              <Text variant="inherit" tone="intakeSecondary" italic>
                {APP_MESSAGES.UNTITLED_QUESTION}
              </Text>
            )}
            {q.required && (
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
          </Text>
        </div>

        {/* Quick Action Buttons on Selected Field */}
        {isSelected && <QuestionActions questionId={q.id} index={index} />}
      </div>

      {/* Description / Instructions */}
      {q.description && (
        <div className="mb-3 -mt-1">
          <Text as="p" variant="small" tone="intakeSecondary">
            {q.description}
          </Text>
        </div>
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
                <Text variant="inherit">{opt.label}</Text>
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
                <Text variant="inherit">{opt.label}</Text>
              </div>
            ))}
          </div>
        )}

        {q.type === "checkbox" && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-intake-border bg-intake-bg">
            <div className="w-4 h-4 rounded border border-intake-border bg-intake-surface mt-0.5" />
            <Text variant="small" tone="intake" weight="medium">
              {q.label}
            </Text>
          </div>
        )}
      </div>

      {/* Condition Footer Indicator */}
      {q.visibility && (
        <div className="mt-3 pt-2.5 border-t border-intake-border flex items-center gap-1.5 text-caption text-intake-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-intake-primary-action" />
          <Text variant="inherit">
            {
              APP_MESSAGES.CONDITIONAL_DISPLAYS_ONLY_WHEN_PARENT_CONDITION_IS_SATISFIED
            }
          </Text>
        </div>
      )}
    </div>
  );
});
