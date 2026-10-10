"use client";
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
      className={`relative rounded-xl border transition-all p-5 cursor-pointer ${
        isSelected
          ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10"
          : "bg-white hover:border-gray-300 border-gray-200/90 shadow-2xs"
      }`}
    >
      {/* Top Header of Question Card */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            #{index + 1}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {q.label || (
              <span className="text-gray-400 italic">Untitled Question</span>
            )}
          </span>
          {q.required && <span className="text-red-500 font-bold">*</span>}
        </div>

        {/* Quick Action Buttons on Selected Field */}
        {isSelected && <QuestionActions questionId={q.id} index={index} />}
      </div>

      {/* Description / Instructions */}
      {q.description && (
        <p className="text-xs text-gray-500 mb-3 -mt-1">{q.description}</p>
      )}

      {/* Mock Input Controls */}
      <div className="pointer-events-none opacity-90">
        {q.type === "short_text" && (
          <Input
            type="text"
            readOnly
            placeholder={q.placeholder || "Short text response..."}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-400"
          />
        )}

        {q.type === "long_text" && (
          <Textarea
            readOnly
            rows={3}
            placeholder={q.placeholder || "Detailed long text response..."}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-400 resize-none"
          />
        )}

        {q.type === "number" && (
          <Input
            type="number"
            readOnly
            placeholder={q.placeholder || "0"}
            className="w-48 text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-400"
          />
        )}

        {q.type === "single_select" && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-gray-700"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-white" />
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
                className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-gray-700"
              >
                <div className="w-3.5 h-3.5 rounded border border-gray-300 bg-white" />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        )}

        {q.type === "checkbox" && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50">
            <div className="w-4 h-4 rounded border border-gray-300 bg-white mt-0.5" />
            <span className="text-xs text-gray-700 font-medium">{q.label}</span>
          </div>
        )}
      </div>

      {/* Condition Footer Indicator */}
      {q.visibility && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-purple-700">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>
            Conditional: Displays only when parent condition is satisfied
          </span>
        </div>
      )}
    </div>
  );
}
