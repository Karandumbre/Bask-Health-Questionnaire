"use client";

import { Button } from "@/components/ui/button";

import { useState, type ComponentType } from "react";
import { useBuilder } from "../context/builder-context";
import type { FieldType } from "@/features/forms/domain/types";
import {
  TextIcon,
  NoteIcon,
  HashtagIcon,
  SelectIcon,
  ListBulletedIcon,
  CheckboxIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DuplicateIcon,
  DeleteIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";

const QUESTION_TYPE_CONFIG: Record<
  FieldType,
  {
    label: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  short_text: {
    label: "Short Text",
    description: "Single-line response (e.g. name, email)",
    icon: TextIcon,
  },
  long_text: {
    label: "Long Text",
    description: "Multi-line medical details or notes",
    icon: NoteIcon,
  },
  number: {
    label: "Numeric",
    description: "Age, dosage, or measurement values",
    icon: HashtagIcon,
  },
  single_select: {
    label: "Single Select",
    description: "Radio choices with conditional support",
    icon: SelectIcon,
  },
  multi_select: {
    label: "Multi-Select",
    description: "Checklist of multiple options",
    icon: ListBulletedIcon,
  },
  checkbox: {
    label: "Consent / Checkbox",
    description: "Required acknowledgment or opt-in",
    icon: CheckboxIcon,
  },
};

export function FieldNavigator() {
  const {
    definition,
    selectedQuestionId,
    selectQuestion,
    addQuestion,
    duplicateQuestion,
    deleteQuestion,
    reorderQuestion,
    publishValidationErrors,
  } = useBuilder();

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const handleAddType = (type: FieldType) => {
    addQuestion(type);
    setIsAddMenuOpen(false);
  };

  return (
    <aside className="w-80 shrink-0 border-r border-gray-200 bg-gray-50/70 flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Navigator Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between relative">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Form Questions
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {definition.questions.length}{" "}
            {definition.questions.length === 1 ? "field" : "fields"}
          </p>
        </div>

        {/* Add Question Button & Dropdown */}
        <div className="relative">
          <Button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            aria-expanded={isAddMenuOpen}
            aria-haspopup="menu"
            aria-label="Add new field"
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xs transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Field</span>
          </Button>

          {isAddMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAddMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in duration-100">
                <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Select Field Type
                </div>
                {(Object.keys(QUESTION_TYPE_CONFIG) as FieldType[]).map(
                  (type) => {
                    const conf = QUESTION_TYPE_CONFIG[type];
                    if (!conf) return null;
                    const Icon = conf.icon;
                    return (
                      <Button
                        key={type}
                        onClick={() => handleAddType(type)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50/70 flex items-start gap-2.5 transition-colors group"
                      >
                        <div className="p-1 rounded bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-900 group-hover:text-blue-700">
                            {conf.label}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {conf.description}
                          </div>
                        </div>
                      </Button>
                    );
                  },
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {definition.questions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-200 rounded-lg m-2">
            <p className="text-xs font-medium text-gray-600">
              No questions added yet
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Click &quot;Add Field&quot; above to create clinical intake
              questions.
            </p>
          </div>
        ) : (
          definition.questions.map((q, index) => {
            const isSelected = q.id === selectedQuestionId;
            const typeConf = QUESTION_TYPE_CONFIG[q.type];
            if (!typeConf) return null;
            const Icon = typeConf.icon;

            const hasError = publishValidationErrors.some(
              (err) => err.questionId === q.id,
            );

            return (
              <div
                key={q.id}
                onClick={() => selectQuestion(q.id)}
                className={`group relative rounded-lg border p-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-blue-500 shadow-xs ring-1 ring-blue-500/20"
                    : "bg-white hover:bg-gray-50/80 border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Icon, Index, Label */}
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="text-[11px] font-mono font-medium text-gray-400 mt-0.5">
                      {index + 1}.
                    </span>
                    <div className="p-1 rounded bg-gray-100 text-gray-600 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {q.label || (
                          <span className="italic text-gray-400">
                            Untitled Question
                          </span>
                        )}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                          {typeConf.label}
                        </span>

                        {q.required && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded font-medium">
                            Required
                          </span>
                        )}

                        {q.visibility && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.2 rounded font-medium">
                            Conditional
                          </span>
                        )}

                        {hasError && (
                          <span
                            className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-0.5"
                            title="Has validation issue"
                          >
                            <AlertTriangleIcon className="w-3 h-3 text-amber-600" />
                            Issue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Reorder, Duplicate, Delete */}
                  <div
                    className={`flex items-center gap-0.5 ${
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    } transition-opacity`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Move Up */}
                    <Button
                      onClick={() => reorderQuestion(q.id, "up")}
                      disabled={index === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move up (Keyboard accessible)"
                      aria-label={`Move question ${index + 1} up`}
                    >
                      <ChevronUpIcon className="w-3.5 h-3.5" />
                    </Button>

                    {/* Move Down */}
                    <Button
                      onClick={() => reorderQuestion(q.id, "down")}
                      disabled={index === definition.questions.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move down (Keyboard accessible)"
                      aria-label={`Move question ${index + 1} down`}
                    >
                      <ChevronDownIcon className="w-3.5 h-3.5" />
                    </Button>

                    {/* Duplicate */}
                    <Button
                      onClick={() => duplicateQuestion(q.id)}
                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Duplicate field"
                      aria-label={`Duplicate question ${index + 1}`}
                    >
                      <DuplicateIcon className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      onClick={() => deleteQuestion(q.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete field"
                      aria-label={`Delete question ${index + 1}`}
                    >
                      <DeleteIcon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
