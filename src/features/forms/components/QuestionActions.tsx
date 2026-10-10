"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Button } from "@/components/ui/button";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  DuplicateIcon,
  DeleteIcon,
} from "@/components/ui/icons";
import { useBuilder } from "../context/builder-context";

export function QuestionActions({
  questionId,
  index,
}: {
  questionId: string;
  index: number;
}) {
  const { definition, reorderQuestion, duplicateQuestion, deleteQuestion } =
    useBuilder();
  const actions = [
    {
      label: APP_MESSAGES.MOVE_UP,
      icon: ChevronUpIcon,
      disabled: index === 0,
      run: () => reorderQuestion(questionId, "up"),
    },
    {
      label: APP_MESSAGES.MOVE_DOWN,
      icon: ChevronDownIcon,
      disabled: index === definition.questions.length - 1,
      run: () => reorderQuestion(questionId, "down"),
    },
    {
      label: "Duplicate",
      icon: DuplicateIcon,
      disabled: false,
      run: () => duplicateQuestion(questionId),
    },
    {
      label: "Delete",
      icon: DeleteIcon,
      disabled: false,
      run: () => deleteQuestion(questionId),
    },
  ];
  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(event) => event.stopPropagation()}
    >
      {actions.map(({ label, icon: Icon, disabled, run }) => (
        <Button
          key={label}
          onClick={run}
          disabled={disabled}
          title={label}
          aria-label={`${label} question ${index + 1}`}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-20"
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
