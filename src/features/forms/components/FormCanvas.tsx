"use client";

import { Button } from "@/components/ui/button";
import { EditorQuestionCard } from "./EditorQuestionCard";
import { QuestionInput } from "./QuestionInput";
import { ThemeControls } from "@/features/themes/components/ThemeControls";
import { themeToCssVariables } from "@/features/themes/domain/theme-tokens";

import { useState } from "react";
import { useBuilder } from "../context/builder-context";
import {
  getVisibleQuestions,
  pruneHiddenAnswers,
} from "@/features/patients/domain/visibility";
import type {
  PatientAnswers,
  CanonicalAnswer,
} from "@/features/patients/domain/types";
export function FormCanvas() {
  const { definition, theme, activeMode, previewViewport } = useBuilder();

  // Preview mode answers state
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
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
      return pruneHiddenAnswers(next, definition.questions);
    });
  };

  return (
    <main className="flex-1 bg-gray-100/60 overflow-y-auto h-[calc(100vh-3.5rem)] p-6 flex flex-col items-center">
      <ThemeControls mode={themeMode} onModeChange={setThemeMode} />
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
          {definition.questions.map((q, idx) => (
            <EditorQuestionCard key={q.id} question={q} index={idx} />
          ))}
        </div>
      ) : (
        /* Patient Simulator Preview View */
        <div
          style={themeToCssVariables(theme, themeMode)}
          data-patient-theme
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
            <div className="bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] p-5 shadow-xs">
              <h1 className="text-lg font-bold text-[var(--theme-text-primary)]">
                {definition.title}
              </h1>
              {definition.description && (
                <p className="text-xs text-[var(--theme-text-secondary)] mt-1">
                  {definition.description}
                </p>
              )}
            </div>

            {/* Questions with live conditional rendering */}
            {getVisibleQuestions(definition.questions, previewAnswers).map(
              (q) => (
                <QuestionInput
                  key={q.id}
                  question={q}
                  answers={previewAnswers}
                  onAnswerChange={handlePreviewAnswerChange}
                />
              ),
            )}

            <div className="pt-2">
              <Button
                type="button"
                className="w-full bg-[var(--theme-primary-action)] text-[var(--theme-primary-action-fg)] font-semibold text-xs py-3 rounded-xl shadow-xs hover:bg-[var(--theme-primary-action-hover)] transition-colors"
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
