"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

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
        <p className="text-xs font-medium text-gray-500">
          {APP_MESSAGES.NO_FIELD_SELECTED}
        </p>
        <p className="text-caption text-gray-400 mt-1">
          {APP_MESSAGES.SELECT_A_QUESTION_FROM_THE_NAVIGATOR_OR_CANVAS_TO}
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
    <aside className="w-88 shrink-0 border-l border-gray-200 bg-white flex flex-col h-editor-height overflow-y-auto select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-micro font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {selectedQuestion.type.replace("_", " ")}
          </span>
          <h3 className="text-xs font-bold text-gray-900">
            {APP_MESSAGES.QUESTION_SETTINGS}
          </h3>
        </div>
        <p
          className="truncate text-micro font-mono text-gray-400 select-text"
          title={selectedQuestion.id}
        >
          {APP_MESSAGES.ID} {selectedQuestion.id}
        </p>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Label input */}
        <FormField
          id="question-label-input"
          label={APP_MESSAGES.QUESTION_LABEL}
          required
        >
          <Input
            id="question-label-input"
            type="text"
            value={selectedQuestion.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder={APP_MESSAGES.E_G_DO_YOU_HAVE_ANY_ALLERGIES}
            className="rounded-md p-2"
          />
        </FormField>

        {/* Description / Instructions */}
        <FormField
          id="question-description-input"
          label={APP_MESSAGES.HELP_TEXT_INSTRUCTIONS}
        >
          <Textarea
            id="question-description-input"
            value={selectedQuestion.description || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder={APP_MESSAGES.ADDITIONAL_GUIDANCE_FOR_THE_PATIENT}
            rows={2}
            className="rounded-md p-2"
          />
        </FormField>

        {/* Placeholder (if applicable) */}
        {(selectedQuestion.type === "short_text" ||
          selectedQuestion.type === "long_text" ||
          selectedQuestion.type === "number") && (
          <FormField
            id="question-placeholder-input"
            label={APP_MESSAGES.FIELD_PLACEHOLDER}
          >
            <Input
              id="question-placeholder-input"
              type="text"
              value={selectedQuestion.placeholder || ""}
              onChange={(e) => handlePlaceholderChange(e.target.value)}
              placeholder={APP_MESSAGES.E_G_TYPE_YOUR_ANSWER}
              className="rounded-md p-2"
            />
          </FormField>
        )}

        {/* Required switch */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
          <div>
            <label
              htmlFor="question-required-toggle"
              className="text-xs font-semibold text-gray-900 cursor-pointer block"
            >
              {APP_MESSAGES.REQUIRED_RESPONSE}
            </label>
            <p className="text-caption text-gray-400">
              {APP_MESSAGES.PATIENT_CANNOT_SUBMIT_WITHOUT_COMPLETING}
            </p>
          </div>
          <Input
            id="question-required-toggle"
            type="checkbox"
            aria-label={APP_MESSAGES.REQUIRED_RESPONSE_2}
            checked={selectedQuestion.required}
            onChange={(e) => handleRequiredToggle(e.target.checked)}
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
