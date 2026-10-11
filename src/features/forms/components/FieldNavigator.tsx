"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { QuestionActions } from "./QuestionActions";
import { Badge } from "@/components/ui/badge";
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
    label: APP_MESSAGES.SHORT_TEXT,
    description: APP_MESSAGES.SINGLE_LINE_RESPONSE_E_G_NAME_EMAIL,
    icon: TextIcon,
  },
  long_text: {
    label: APP_MESSAGES.LONG_TEXT,
    description: APP_MESSAGES.MULTI_LINE_MEDICAL_DETAILS_OR_NOTES,
    icon: NoteIcon,
  },
  number: {
    label: "Numeric",
    description: APP_MESSAGES.AGE_DOSAGE_OR_MEASUREMENT_VALUES,
    icon: HashtagIcon,
  },
  single_select: {
    label: APP_MESSAGES.SINGLE_SELECT,
    description: APP_MESSAGES.RADIO_CHOICES_WITH_CONDITIONAL_SUPPORT,
    icon: SelectIcon,
  },
  multi_select: {
    label: "Multi-Select",
    description: APP_MESSAGES.CHECKLIST_OF_MULTIPLE_OPTIONS,
    icon: ListBulletedIcon,
  },
  checkbox: {
    label: APP_MESSAGES.CONSENT_CHECKBOX,
    description: APP_MESSAGES.REQUIRED_ACKNOWLEDGMENT_OR_OPT_IN,
    icon: CheckboxIcon,
  },
};

export function FieldNavigator() {
  const {
    definition,
    selectedQuestionId,
    selectQuestion,
    addQuestion,
    publishValidationErrors,
  } = useBuilder();

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const handleAddType = (type: FieldType) => {
    addQuestion(type);
    setIsAddMenuOpen(false);
  };

  return (
    <aside className="w-80 shrink-0 border-r border-gray-200 bg-gray-50/70 flex flex-col h-editor-height select-none">
      {/* Navigator Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between relative">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {APP_MESSAGES.FORM_QUESTIONS}
          </h2>
          <p className="text-caption text-gray-400 mt-0.5">
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
            aria-label={APP_MESSAGES.ADD_NEW_FIELD}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-xs transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>{APP_MESSAGES.ADD_FIELD}</span>
          </Button>

          {isAddMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAddMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in duration-100">
                <div className="px-3 py-1.5 border-b border-gray-100 text-micro font-bold uppercase tracking-wider text-gray-400">
                  {APP_MESSAGES.SELECT_FIELD_TYPE}
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
                          <div className="text-caption text-gray-400 truncate">
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
              {APP_MESSAGES.NO_QUESTIONS_ADDED_YET}
            </p>
            <p className="text-caption text-gray-400 mt-1">
              {APP_MESSAGES.CLICK_QUOT_ADD_FIELD_QUOT_ABOVE_TO_CREATE_CLINICAL}
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
                    <span className="text-caption font-mono font-medium text-gray-400 mt-0.5">
                      {index + 1}.
                    </span>
                    <div className="p-1 rounded bg-gray-100 text-gray-600 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {q.label || (
                          <span className="italic text-gray-400">
                            {APP_MESSAGES.UNTITLED_QUESTION}
                          </span>
                        )}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge
                          tone="neutral"
                          className="text-gray-500 border-0 py-0.2"
                        >
                          {typeConf.label}
                        </Badge>

                        {q.required && (
                          <Badge tone="info" className="py-0.2">
                            {APP_MESSAGES.REQUIRED}
                          </Badge>
                        )}

                        {q.visibility && (
                          <Badge tone="purple" className="py-0.2">
                            {APP_MESSAGES.CONDITIONAL}
                          </Badge>
                        )}

                        {hasError && (
                          <Badge
                            tone="warning"
                            className="rounded px-1.5 py-0.2 font-normal text-amber-700 gap-0.5"
                            title={APP_MESSAGES.HAS_VALIDATION_ISSUE}
                          >
                            <AlertTriangleIcon className="w-3 h-3 text-amber-600" />
                            {APP_MESSAGES.ISSUE}
                          </Badge>
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
                    <QuestionActions questionId={q.id} index={index} />
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
