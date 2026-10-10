"use client";

import { useBuilder } from "../context/builder-context";
import { ConditionBuilder } from "./ConditionBuilder";
import { PlusIcon, DeleteIcon, AlertTriangleIcon } from "@/components/ui/icons";

function generateOptionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `opt_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `opt_${Date.now().toString(36)}`;
}

export function QuestionInspector() {
  const { definition, selectedQuestionId, updateQuestion } = useBuilder();

  const selectedQuestion = definition.questions.find(
    (q) => q.id === selectedQuestionId
  );

  if (!selectedQuestion) {
    return (
      <aside className="w-88 flex-shrink-0 border-l border-gray-200 bg-white p-6 flex flex-col items-center justify-center text-center text-gray-400 select-none">
        <p className="text-xs font-medium text-gray-500">No field selected</p>
        <p className="text-[11px] text-gray-400 mt-1">
          Select a question from the navigator or canvas to configure its properties.
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
    if ("placeholder" in selectedQuestion) {
      updateQuestion(selectedQuestion.id, { placeholder: val });
    }
  };

  const handleRequiredToggle = (val: boolean) => {
    updateQuestion(selectedQuestion.id, { required: val });
  };

  // Option management for single/multi select
  const isSelect =
    selectedQuestion.type === "single_select" || selectedQuestion.type === "multi_select";
  const selectOptions = isSelect ? selectedQuestion.options : [];

  const handleAddOption = () => {
    if (!isSelect) return;
    const newOptId = generateOptionId();
    const newOpt = {
      id: newOptId,
      label: `Option ${selectOptions.length + 1}`,
    };
    updateQuestion(selectedQuestion.id, {
      options: [...selectOptions, newOpt],
    });
  };

  const handleUpdateOptionLabel = (optId: string, label: string) => {
    if (!isSelect) return;
    const updatedOptions = selectOptions.map((opt) =>
      opt.id === optId ? { ...opt, label } : opt
    );
    updateQuestion(selectedQuestion.id, { options: updatedOptions });
  };

  const handleDeleteOption = (optId: string) => {
    if (!isSelect || selectOptions.length <= 2) return;
    const updatedOptions = selectOptions.filter((opt) => opt.id !== optId);
    updateQuestion(selectedQuestion.id, { options: updatedOptions });
  };

  return (
    <aside className="w-88 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {selectedQuestion.type.replace("_", " ")}
          </span>
          <h3 className="text-xs font-bold text-gray-900 mt-1.5">Question Settings</h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">ID: {selectedQuestion.id}</span>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Label input */}
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Question Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={selectedQuestion.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="e.g. Do you have any allergies?"
            className="w-full text-xs border border-gray-300 rounded-md p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Description / Instructions */}
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Help Text / Instructions
          </label>
          <textarea
            value={selectedQuestion.description || ""}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Additional guidance for the patient..."
            rows={2}
            className="w-full text-xs border border-gray-300 rounded-md p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* Placeholder (if applicable) */}
        {"placeholder" in selectedQuestion && (
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Field Placeholder
            </label>
            <input
              type="text"
              value={selectedQuestion.placeholder || ""}
              onChange={(e) => handlePlaceholderChange(e.target.value)}
              placeholder="e.g. Type your answer..."
              className="w-full text-xs border border-gray-300 rounded-md p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {/* Required switch */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
          <div>
            <span className="text-xs font-semibold text-gray-900">Required Response</span>
            <p className="text-[11px] text-gray-400">
              Patient cannot submit without completing
            </p>
          </div>
          <input
            type="checkbox"
            checked={selectedQuestion.required}
            onChange={(e) => handleRequiredToggle(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Options Management for Single/Multi Select */}
        {isSelect && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-900">
                Options ({selectOptions.length})
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusIcon className="w-3 h-3" />
                <span>Add Choice</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {selectOptions.map((opt, optIndex) => (
                <div key={opt.id} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-gray-400 w-4 text-right">
                    {optIndex + 1}.
                  </span>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleUpdateOptionLabel(opt.id, e.target.value)}
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
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
                  </button>
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

        {/* Numeric Bounds (if number) */}
        {selectedQuestion.type === "number" && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <label className="text-xs font-semibold text-gray-900">Numeric Bounds</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Min Value</label>
                <input
                  type="number"
                  value={selectedQuestion.validation?.min ?? ""}
                  onChange={(e) =>
                    updateQuestion(selectedQuestion.id, {
                      validation: {
                        ...selectedQuestion.validation,
                        min: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  className="w-full text-xs border border-gray-300 rounded p-1.5 outline-none"
                  placeholder="None"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Max Value</label>
                <input
                  type="number"
                  value={selectedQuestion.validation?.max ?? ""}
                  onChange={(e) =>
                    updateQuestion(selectedQuestion.id, {
                      validation: {
                        ...selectedQuestion.validation,
                        max: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  className="w-full text-xs border border-gray-300 rounded p-1.5 outline-none"
                  placeholder="None"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200">
              <span className="text-[11px] font-medium text-gray-700">Whole numbers only</span>
              <input
                type="checkbox"
                checked={selectedQuestion.validation?.integerOnly ?? true}
                onChange={(e) =>
                  updateQuestion(selectedQuestion.id, {
                    validation: {
                      ...selectedQuestion.validation,
                      integerOnly: e.target.checked,
                    },
                  })
                }
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              />
            </div>
          </div>
        )}

        {/* Text Length Bounds (if text) */}
        {(selectedQuestion.type === "short_text" || selectedQuestion.type === "long_text") && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <label className="text-xs font-semibold text-gray-900">Length Limits</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Min Length</label>
                <input
                  type="number"
                  value={selectedQuestion.validation?.minLength ?? ""}
                  onChange={(e) =>
                    updateQuestion(selectedQuestion.id, {
                      validation: {
                        ...selectedQuestion.validation,
                        minLength: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  className="w-full text-xs border border-gray-300 rounded p-1.5 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-0.5">Max Length</label>
                <input
                  type="number"
                  value={selectedQuestion.validation?.maxLength ?? ""}
                  onChange={(e) =>
                    updateQuestion(selectedQuestion.id, {
                      validation: {
                        ...selectedQuestion.validation,
                        maxLength: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  className="w-full text-xs border border-gray-300 rounded p-1.5 outline-none"
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </div>
        )}

        {/* Conditional Visibility Section */}
        <div className="pt-2 border-t border-gray-200">
          <ConditionBuilder question={selectedQuestion} />
        </div>
      </div>
    </aside>
  );
}
