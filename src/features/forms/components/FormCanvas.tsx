"use client";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

import { useState } from "react";
import { useBuilder } from "../context/builder-context";
import { evaluateQuestionVisibility } from "@/features/patients/domain/visibility";
import type { Question } from "@/features/forms/domain/types";
import type {
  PatientAnswers,
  CanonicalAnswer,
} from "@/features/patients/domain/types";
import {
  DuplicateIcon,
  DeleteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@/components/ui/icons";

export function FormCanvas() {
  const {
    definition,
    theme,
    selectedQuestionId,
    selectQuestion,
    duplicateQuestion,
    deleteQuestion,
    reorderQuestion,
    activeMode,
    previewViewport,
  } = useBuilder();

  // Preview mode answers state
  const [previewAnswers, setPreviewAnswers] = useState<PatientAnswers>({});

  const handlePreviewAnswerChange = (
    questionId: string,
    val: CanonicalAnswer | undefined,
  ) => {
    setPreviewAnswers((prev) => {
      const next: PatientAnswers = { ...prev };
      if (val === undefined) {
        delete next[questionId];
      } else {
        next[questionId] = val;
      }
      return next;
    });
  };

  // Render question widget in editor mode
  const renderEditorWidget = (q: Question, index: number) => {
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
          {isSelected && (
            <div
              className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                onClick={() => reorderQuestion(q.id, "up")}
                disabled={index === 0}
                className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-20"
                title="Move up"
              >
                <ChevronUpIcon className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                onClick={() => reorderQuestion(q.id, "down")}
                disabled={index === definition.questions.length - 1}
                className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-20"
                title="Move down"
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </Button>
              <div className="w-px h-3 bg-gray-200" />
              <Button
                type="button"
                onClick={() => duplicateQuestion(q.id)}
                className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-white"
                title="Duplicate"
              >
                <DuplicateIcon className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                onClick={() => deleteQuestion(q.id)}
                className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-white"
                title="Delete"
              >
                <DeleteIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
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
              <span className="text-xs text-gray-700 font-medium">
                {q.label}
              </span>
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
  };

  // Render question widget in interactive live patient preview mode
  const renderPreviewWidget = (q: Question) => {
    const questionMap = new Map<string, Question>();
    for (const item of definition.questions) {
      questionMap.set(item.id, item);
    }
    const isVisible = evaluateQuestionVisibility(
      q,
      previewAnswers,
      questionMap,
    );
    if (!isVisible) return null;

    const currentVal = previewAnswers[q.id];

    return (
      <div
        key={q.id}
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all animate-in fade-in duration-150"
      >
        <div className="mb-2">
          <label className="block text-sm font-semibold text-gray-900">
            {q.label}
            {q.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {q.description && (
            <p className="text-xs text-gray-500 mt-1">{q.description}</p>
          )}
        </div>

        <div className="mt-3">
          {q.type === "short_text" && (
            <Input
              type="text"
              value={typeof currentVal === "string" ? currentVal : ""}
              onChange={(e) => handlePreviewAnswerChange(q.id, e.target.value)}
              placeholder={q.placeholder || "Your answer..."}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          )}

          {q.type === "long_text" && (
            <Textarea
              rows={3}
              value={typeof currentVal === "string" ? currentVal : ""}
              onChange={(e) => handlePreviewAnswerChange(q.id, e.target.value)}
              placeholder={q.placeholder || "Enter details..."}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          )}

          {q.type === "number" && (
            <Input
              type="number"
              value={typeof currentVal === "number" ? currentVal : ""}
              onChange={(e) =>
                handlePreviewAnswerChange(
                  q.id,
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              placeholder={q.placeholder || "0"}
              className="w-48 text-xs border border-gray-300 rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          )}

          {q.type === "single_select" && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = currentVal === opt.id;
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePreviewAnswerChange(q.id, opt.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 text-blue-900 font-medium ring-1 ring-blue-600/20"
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-xs">{opt.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {q.type === "multi_select" && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const selectedList = Array.isArray(currentVal)
                  ? (currentVal as string[])
                  : [];
                const isChecked = selectedList.includes(opt.id);
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const next = isChecked
                        ? selectedList.filter((id) => id !== opt.id)
                        : [...selectedList, opt.id];
                      handlePreviewAnswerChange(q.id, next);
                    }}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isChecked
                        ? "border-blue-600 bg-blue-50/60 text-blue-900 font-medium ring-1 ring-blue-600/20"
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isChecked && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-xs">{opt.label}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {q.type === "checkbox" && (
            <Button
              type="button"
              onClick={() => handlePreviewAnswerChange(q.id, !currentVal)}
              className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 ${
                  currentVal === true
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {currentVal === true && (
                  <CheckIcon className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="text-xs text-gray-800 leading-snug">
                {q.label}
              </span>
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 bg-gray-100/60 overflow-y-auto h-[calc(100vh-3.5rem)] p-6 flex flex-col items-center">
      {activeMode === "editor" ? (
        /* Editor Canvas View */
        <div className="w-full max-w-2xl space-y-4 pb-20">
          {/* Form Header Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs">
            <h1 className="text-xl font-bold text-gray-900">
              {definition.title}
            </h1>
            {definition.description && (
              <p className="text-xs text-gray-500 mt-1">
                {definition.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-400">
              <span>Theme: {theme.presetName}</span>
              <span>•</span>
              <span>{definition.questions.length} questions total</span>
            </div>
          </div>

          {/* Question List */}
          {definition.questions.map((q, idx) => renderEditorWidget(q, idx))}
        </div>
      ) : (
        /* Patient Simulator Preview View */
        <div
          className={`w-full transition-all duration-200 pb-20 ${
            previewViewport === "mobile"
              ? "max-w-sm rounded-[36px] border-8 border-gray-900 shadow-2xl p-4 bg-gray-50 my-2"
              : "max-w-xl"
          }`}
        >
          {/* Simulator Banner */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xs font-semibold text-blue-900">
              Interactive Patient Simulator
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Testing live conditions & visibility. Responses here are not saved
              to the database.
            </p>
          </div>

          <div className="space-y-4">
            {/* Clinical Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
              <h1 className="text-lg font-bold text-gray-900">
                {definition.title}
              </h1>
              {definition.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {definition.description}
                </p>
              )}
            </div>

            {/* Questions with live conditional rendering */}
            {definition.questions.map((q) => renderPreviewWidget(q))}

            <div className="pt-2">
              <Button
                type="button"
                className="w-full bg-blue-600 text-white font-semibold text-xs py-3 rounded-xl shadow-xs hover:bg-blue-700 transition-colors"
              >
                Submit Intake (Simulation)
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
