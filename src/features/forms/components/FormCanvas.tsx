"use client";
import { Text } from "@/components/ui/text";
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
  const {
    definition,
    theme,
    updateTheme,
    activeMode,
    previewViewport,
    selectedQuestionId,
    selectQuestion,
  } = useBuilder();

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
            <Text as="h1" variant="section" tone="intake" weight="bold">
              {definition.title}
            </Text>
            {definition.description && (
              <div className="mt-1">
                <Text as="p" variant="small" tone="intakeSecondary">
                  {definition.description}
                </Text>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-caption text-intake-text-secondary">
              <Text variant="inherit">
                {APP_MESSAGES.THEME} {theme.presetName}
              </Text>
              <Text variant="inherit">•</Text>
              <Text variant="inherit">
                {definition.questions.length} {APP_MESSAGES.QUESTIONS_TOTAL}
              </Text>
            </div>
          </div>

          {/* Question List */}
          {definition.questions.map((q, idx) => (
            <EditorQuestionCard
              key={q.id}
              question={q}
              index={idx}
              isSelected={q.id === selectedQuestionId}
              selectQuestion={selectQuestion}
            />
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
          <Alert tone="info" className="mb-4 rounded-xl text-center">
            <Text as="p" variant="small" tone="info" weight="semibold">
              {APP_MESSAGES.INTERACTIVE_PATIENT_SIMULATOR}
            </Text>
            <div className="mt-0.5">
              <Text as="p" variant="caption" tone="info">
                {
                  APP_MESSAGES.TESTING_LIVE_CONDITIONS_VISIBILITY_RESPONSES_HERE_ARE_NOT_SAVED
                }
              </Text>
            </div>
          </Alert>

          <div className="space-y-4">
            {/* Clinical Header */}
            <div className="bg-intake-surface rounded-xl border border-intake-border p-5 shadow-xs">
              <Text as="h1" variant="heading" tone="intake" weight="bold">
                {definition.title}
              </Text>
              {definition.description && (
                <div className="mt-1">
                  <Text as="p" variant="small" tone="intakeSecondary">
                    {definition.description}
                  </Text>
                </div>
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
                <Text role="status" as="p" variant="small" tone="intake">
                  {APP_MESSAGES.PREVIEW_VALIDATION_PASSED}
                </Text>
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
                theme="intake"
                variant="primary"
                size="lg"
                fullWidth
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
