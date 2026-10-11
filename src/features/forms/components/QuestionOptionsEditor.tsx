"use client";
import { Text } from "@/components/ui/text";
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
        <Text as="h3" variant="small" tone="primary" weight="semibold">
          {APP_MESSAGES.OPTIONS}
          {selectOptions.length})
        </Text>
        <Button
          type="button"
          onClick={handleAddOption}
          variant="link"
          tone="primary"
          size="xs"
        >
          <PlusIcon className="w-3 h-3" />
          <Text variant="inherit">{APP_MESSAGES.ADD_CHOICE}</Text>
        </Button>
      </div>

      <div className="space-y-1.5">
        {selectOptions.map((opt, optIndex) => (
          <div key={opt.id} className="flex items-center gap-1.5">
            <span className="w-4">
              <Text variant="micro" tone="subtle" mono align="right">
                {optIndex + 1}.
              </Text>
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
              title={
                selectOptions.length <= 2
                  ? APP_MESSAGES.MUST_HAVE_AT_LEAST_2_CHOICES
                  : APP_MESSAGES.DELETE_OPTION
              }
              variant="ghost"
              tone="danger"
              size="icon-sm"
            >
              <DeleteIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {selectOptions.length < 2 && (
        <div className="flex items-center gap-1">
          <AlertTriangleIcon className="w-3 h-3 text-red-500" />
          <Text as="p" variant="caption" tone="danger">
            {APP_MESSAGES.AT_LEAST_2_CHOICES_ARE_REQUIRED}
          </Text>
        </div>
      )}
    </div>
  );
}
