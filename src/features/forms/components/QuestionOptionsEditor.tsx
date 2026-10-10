"use client";
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
  // Option management for single/multi select
  const isSelect =
    question.type === "single_select" || question.type === "multi_select";
  const selectOptions = isSelect ? question.options : [];

  const handleAddOption = () => {
    if (!isSelect) return;
    const newOptId = generateId("opt");
    const newOpt = {
      id: newOptId,
      label: `Option ${selectOptions.length + 1}`,
    };
    onChange({
      options: [...selectOptions, newOpt],
    });
  };

  const handleUpdateOptionLabel = (optId: string, label: string) => {
    if (!isSelect) return;
    const updatedOptions = selectOptions.map((opt) =>
      opt.id === optId ? { ...opt, label } : opt,
    );
    onChange({ options: updatedOptions });
  };

  const handleDeleteOption = (optId: string) => {
    if (!isSelect || selectOptions.length <= 2) return;
    const updatedOptions = selectOptions.filter((opt) => opt.id !== optId);
    onChange({ options: updatedOptions });
  };

  return (
    <>
      {/* Options Management for Single/Multi Select */}
      {isSelect && (
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-900">
              Options ({selectOptions.length})
            </label>
            <Button
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              <PlusIcon className="w-3 h-3" />
              <span>Add Choice</span>
            </Button>
          </div>

          <div className="space-y-1.5">
            {selectOptions.map((opt, optIndex) => (
              <div key={opt.id} className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-gray-400 w-4 text-right">
                  {optIndex + 1}.
                </span>
                <Input
                  type="text"
                  aria-label={`Choice ${optIndex + 1}`}
                  value={opt.label}
                  onChange={(e) =>
                    handleUpdateOptionLabel(opt.id, e.target.value)
                  }
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <Button
                  type="button"
                  onClick={() => handleDeleteOption(opt.id)}
                  disabled={selectOptions.length <= 2}
                  className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-20 disabled:hover:text-gray-400"
                  title={
                    selectOptions.length <= 2
                      ? "Must have at least 2 choices"
                      : "Delete option"
                  }
                >
                  <DeleteIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {selectOptions.length < 2 && (
            <p className="text-[11px] text-red-600 flex items-center gap-1">
              <AlertTriangleIcon className="w-3 h-3 text-red-500" />
              At least 2 choices are required.
            </p>
          )}
        </div>
      )}
    </>
  );
}
