"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { QUESTION_DEFAULTS } from "@/lib/constants/application";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, DeleteIcon, AlertTriangleIcon } from "@/components/ui/icons";
import { generateId } from "../domain/question-operations";
import type {
  Question,
  SingleSelectQuestion,
  MultiSelectQuestion,
} from "../domain/types";

export function QuestionOptionsEditor({
  question,
  onChange,
}: {
  question: SingleSelectQuestion | MultiSelectQuestion;
  onChange: (updates: Partial<Question>) => void;
}) {
  const selectOptions = question.options;

  const handleAddOption = () => {
    const newOptId = generateId("opt");
    const newOpt = {
      id: newOptId,
      label: QUESTION_DEFAULTS.optionLabel(selectOptions.length),
    };
    onChange({
      options: [...selectOptions, newOpt],
    });
  };

  const handleUpdateOptionLabel = (optId: string, label: string) => {
    const updatedOptions = selectOptions.map((opt) =>
      opt.id === optId ? { ...opt, label } : opt,
    );
    onChange({ options: updatedOptions });
  };

  const handleDeleteOption = (optId: string) => {
    if (selectOptions.length <= 2) return;
    const updatedOptions = selectOptions.filter((opt) => opt.id !== optId);
    onChange({ options: updatedOptions });
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-900">
          {APP_MESSAGES.OPTIONS}
          {selectOptions.length})
        </h3>
        <Button
          type="button"
          onClick={handleAddOption}
          className="flex items-center gap-1 text-caption text-blue-600 hover:text-blue-700 font-medium"
        >
          <PlusIcon className="w-3 h-3" />
          <span>{APP_MESSAGES.ADD_CHOICE}</span>
        </Button>
      </div>

      <div className="space-y-1.5">
        {selectOptions.map((opt, optIndex) => (
          <div key={opt.id} className="flex items-center gap-1.5">
            <span className="text-micro font-mono text-gray-400 w-4 text-right">
              {optIndex + 1}.
            </span>
            <Input
              type="text"
              aria-label={`Choice ${optIndex + 1}`}
              value={opt.label}
              onChange={(e) => handleUpdateOptionLabel(opt.id, e.target.value)}
              className="flex-1 rounded px-2 py-1"
            />
            <Button
              type="button"
              onClick={() => handleDeleteOption(opt.id)}
              disabled={selectOptions.length <= 2}
              className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-20 disabled:hover:text-gray-400"
              title={
                selectOptions.length <= 2
                  ? APP_MESSAGES.MUST_HAVE_AT_LEAST_2_CHOICES
                  : APP_MESSAGES.DELETE_OPTION
              }
            >
              <DeleteIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {selectOptions.length < 2 && (
        <p className="text-caption text-red-600 flex items-center gap-1">
          <AlertTriangleIcon className="w-3 h-3 text-red-500" />
          {APP_MESSAGES.AT_LEAST_2_CHOICES_ARE_REQUIRED}
        </p>
      )}
    </div>
  );
}
