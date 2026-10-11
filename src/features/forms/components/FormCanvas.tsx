"use client";
import { APP_MESSAGES } from "@/lib/constants/messages";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EditorQuestionCard } from "./EditorQuestionCard";
import { QuestionInput } from "./QuestionInput";
import { ThemeControls } from "@/features/themes/components/ThemeControls";
import { themeToCssVariables } from "@/features/themes/domain/theme-tokens";

import { useState, useRef } from "react";
import { useBuilder } from "../context/builder-context";
import { getVisibleQuestions } from "@/features/patients/domain/visibility";
import { usePreviewAnswers } from "../hooks/use-preview-answers";
import { focusQuestion } from "@/lib/dom/focus-question";
export function FormCanvas() {
  const { definition, theme, updateTheme, activeMode, previewViewport } =
    useBuilder();

  // Preview mode answers state
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const previewRef = useRef<HTMLDivElement>(null);
  const {
    answers: previewAnswers,
    updateAnswer: handlePreviewAnswerChange,
    validation,
    submissionAttempted,
    validateSubmission,
  } = usePreviewAnswers(definition.questions);

  return (
    <main className="flex-1 bg-gray-100/60 overflow-y-auto h-editor-height p-6 flex flex-col items-center">
      <ThemeControls
        theme={theme}
        onThemeChange={updateTheme}
        editable={activeMode === "editor"}
        mode={themeMode}
        onModeChange={setThemeMode}
      />
      {activeMode === "editor" ? (
        /* Editor Canvas View */
        <div
          style={themeToCssVariables(theme, themeMode)}
          data-patient-theme
          data-theme-mode={themeMode}
          className="w-full max-w-2xl rounded-xl bg-intake-bg text-intake-text-primary p-4 transition-colors duration-200 space-y-4 pb-20"
        >
          {/* Form Header Card */}
          <div className="bg-intake-surface rounded-xl border border-intake-border border-t-4 border-t-intake-primary-action p-6 shadow-2xs transition-colors">
            <h1 className="text-xl font-bold text-intake-text-primary">
              {definition.title}
            </h1>
            {definition.description && (
              <p className="text-xs text-intake-text-secondary mt-1">
                {definition.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-caption text-intake-text-secondary">
              <span>
                {APP_MESSAGES.THEME} {theme.presetName}
              </span>
              <span>•</span>
              <span>
                {definition.questions.length} {APP_MESSAGES.QUESTIONS_TOTAL}
              </span>
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
          ref={previewRef}
          style={themeToCssVariables(theme, themeMode)}
          data-patient-theme
          data-theme-mode={themeMode}
          className={`w-full rounded-xl bg-intake-bg p-4 transition-all duration-200 pb-20 ${
            previewViewport === "mobile"
              ? "max-w-sm rounded-device border-8 border-gray-900 shadow-2xl p-4 bg-intake-bg my-2"
              : "max-w-xl"
          }`}
        >
          {/* Simulator Banner */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xs font-semibold text-blue-900">
              {APP_MESSAGES.INTERACTIVE_PATIENT_SIMULATOR}
            </p>
            <p className="text-caption text-blue-700 mt-0.5">
              {
                APP_MESSAGES.TESTING_LIVE_CONDITIONS_VISIBILITY_RESPONSES_HERE_ARE_NOT_SAVED
              }
            </p>
          </div>

          <div className="space-y-4">
            {/* Clinical Header */}
            <div className="bg-intake-surface rounded-xl border border-intake-border p-5 shadow-xs">
              <h1 className="text-lg font-bold text-intake-text-primary">
                {definition.title}
              </h1>
              {definition.description && (
                <p className="text-xs text-intake-text-secondary mt-1">
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
                  error={
                    validation.errors.find((error) => error.questionId === q.id)
                      ?.issue
                  }
                />
              ),
            )}

            {submissionAttempted &&
              (validation.valid ? (
                <p role="status" className="text-xs text-intake-text-primary">
                  {APP_MESSAGES.PREVIEW_VALIDATION_PASSED}
                </p>
              ) : (
                <Alert>{APP_MESSAGES.INTAKE_VALIDATION_FAILED}</Alert>
              ))}
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  const result = validateSubmission();
                  const first = result.errors[0]?.questionId;
                  if (first) {
                    focusQuestion(first, {
                      container: previewRef.current,
                      scrollIntoView: false,
                    });
                  }
                }}
                className="w-full bg-intake-primary-action text-intake-primary-action-fg font-semibold text-xs py-3 rounded-xl shadow-xs hover:bg-intake-primary-action-hover transition-colors"
              >
                {APP_MESSAGES.SUBMIT_INTAKE_SIMULATION}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
