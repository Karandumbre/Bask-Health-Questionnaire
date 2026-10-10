"use client";

import { Input, Textarea } from "@/components/ui/input";

import { useBuilder } from "../context/builder-context";
import { QuestionConstraintsEditor } from "./QuestionConstraintsEditor";
import { ConditionBuilder } from "./ConditionBuilder";

import { QuestionOptionsEditor } from "./QuestionOptionsEditor";

export function QuestionInspector() {
  const { definition, selectedQuestionId, updateQuestion } = useBuilder();

  const selectedQuestion = definition.questions.find(
    (q) => q.id === selectedQuestionId,
  );

  if (!selectedQuestion) {
    return (
      <aside className="w-88 shrink-0 border-l border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center text-gray-400 select-none">
        <p className="text-xs font-medium text-gray-500">No field selected</p>
        <p className="text-[11px] text-gray-400 mt-1">
          Select a question from the navigator or canvas to configure its
          properties.
        </p>
      </aside>
    );
  }

  const handleLabelChange = (val: string) => {
    updateQuestion(selectedQuestion.id, { label: val });
  };

  const handleDescriptionChange = (val: string) => {
    updateQuestion(selectedQuestion.id, { description: val });
  };

  const handlePlaceholderChange = (val: string) => {
    if (
      selectedQuestion.type === "short_text" ||
      selectedQuestion.type === "long_text" ||
      selectedQuestion.type === "number"
    ) {
      updateQuestion(selectedQuestion.id, { placeholder: val });
    }
  };

  const handleRequiredToggle = (val: boolean) => {
    updateQuestion(selectedQuestion.id, { required: val });
  };

  return (
    <aside className="w-88 shrink-0 border-l border-gray-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {selectedQuestion.type.replace("_", " ")}
          </span>
          <h3 className="text-xs font-bold text-gray-900 mt-1.5">
            Question Settings
          </h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          ID: {selectedQuestion.id}
        </span>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Label input */}
        <div>
          <label
            htmlFor="question-label-input"
            className="block text-xs font-semibold text-gray-800 mb-1"
          >
            Question Label <span className="text-red-500">*</span>
          </label>
          <Input
            id="question-label-input"
            type="text"
            value={selectedQuestion.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="e.g. Do you have any allergies?"
            className="rounded-md p-2"
          />
        </div>

        {/* Description / Instructions */}
        <div>
          <label
            htmlFor="question-description-input"
            className="block text-xs font-semibold text-gray-800 mb-1"
          >
            Help Text / Instructions
          </label>
          <Textarea
            id="question-description-input"
            value={selectedQuestion.description || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Additional guidance for the patient..."
            rows={2}
            className="rounded-md p-2"
          />
        </div>

        {/* Placeholder (if applicable) */}
        {(selectedQuestion.type === "short_text" ||
          selectedQuestion.type === "long_text" ||
          selectedQuestion.type === "number") && (
          <div>
            <label
              htmlFor="question-placeholder-input"
              className="block text-xs font-semibold text-gray-800 mb-1"
            >
              Field Placeholder
            </label>
            <Input
              id="question-placeholder-input"
              type="text"
              value={selectedQuestion.placeholder || ""}
              onChange={(e) => handlePlaceholderChange(e.target.value)}
              placeholder="e.g. Type your answer..."
              className="rounded-md p-2"
            />
          </div>
        )}

        {/* Required switch */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
          <div>
            <label
              htmlFor="question-required-toggle"
              className="text-xs font-semibold text-gray-900 cursor-pointer block"
            >
              Required Response
            </label>
            <p className="text-[11px] text-gray-400">
              Patient cannot submit without completing
            </p>
          </div>
          <Input
            id="question-required-toggle"
            type="checkbox"
            aria-label="Required response"
            checked={selectedQuestion.required}
            onChange={(e) => handleRequiredToggle(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {(selectedQuestion.type === "single_select" ||
          selectedQuestion.type === "multi_select") && (
          <QuestionOptionsEditor
            question={selectedQuestion}
            onChange={(updates) => updateQuestion(selectedQuestion.id, updates)}
          />
        )}

        {(selectedQuestion.type === "number" ||
          selectedQuestion.type === "short_text" ||
          selectedQuestion.type === "long_text") && (
          <QuestionConstraintsEditor
            question={selectedQuestion}
            onChange={(updates) => updateQuestion(selectedQuestion.id, updates)}
          />
        )}

        {/* Conditional Visibility Section */}
        <div className="pt-2 border-t border-gray-200">
          <ConditionBuilder question={selectedQuestion} />
        </div>
      </div>
    </aside>
  );
}
