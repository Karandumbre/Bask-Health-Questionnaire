"use client";

import { useCallback, useMemo, useState } from "react";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { themeToCssVariables } from "@/features/themes/domain/theme-tokens";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { focusQuestion } from "@/lib/dom/focus-question";
import { isQuestionAnswered } from "../domain/validation";
import { getVisibleQuestions } from "../domain/visibility";
import { PatientQuestionField } from "./PatientQuestionField";
import { PatientProgressBar } from "./PatientProgressBar";
import { RecoveryCodeModal } from "./RecoveryCodeModal";
import { ResumeModal } from "./ResumeModal";
import { SubmissionConfirmation } from "./SubmissionConfirmation";
import { IntakeLoading } from "./IntakeLoading";
import { usePatientSession } from "../hooks/use-patient-session";

interface PatientIntakeViewProps {
  slug: string;
}

export function PatientIntakeView({ slug }: PatientIntakeViewProps) {
  const {
    form,
    answers,
    sessionReference,
    recoveryCode,
    loading,
    loadError,
    completed,
    accessEnded,
    confirmationError,
    fieldErrors,
    submitError,
    isSubmitting,
    isStartingSession,
    isSavingProgress,
    submissionResult,
    saveStatus,
    isConflict,
    saveErrorMessage,
    saveFieldErrors,
    progressFieldErrors,
    showRecoveryModal,
    showResumeModal,
    setShowRecoveryModal,
    setShowResumeModal,
    handleAnswerChange,
    handleSaveProgress,
    handleSubmit,
    handleResumeSuccess,
    handleStartNewSession,
    retryLoad,
    retryConfirmation,
  } = usePatientSession(slug);

  const [patientThemeMode, setPatientThemeMode] = useState<"light" | "dark">(
    "light",
  );

  // Filter visible questions in configured order
  const visibleQuestions = useMemo(() => {
    if (!form) return [];
    return getVisibleQuestions(form.definition.questions, answers);
  }, [form, answers]);

  // Count answered visible questions using shared question-aware helper
  const answeredCount = useMemo(() => {
    return visibleQuestions.filter((q) => isQuestionAnswered(q, answers[q.id]))
      .length;
  }, [visibleQuestions, answers]);

  // Calculate unanswered required questions for quick jump navigation
  const unansweredRequiredQuestions = useMemo(() => {
    return visibleQuestions.filter(
      (q) => q.required && !isQuestionAnswered(q, answers[q.id]),
    );
  }, [visibleQuestions, answers]);

  const handleJumpToNextUnanswered = useCallback(() => {
    const nextQ = unansweredRequiredQuestions[0];
    if (nextQ) {
      focusQuestion(nextQ.id);
    }
  }, [unansweredRequiredQuestions]);

  // CSS variables from published theme in active mode
  const cssVars = form ? themeToCssVariables(form.theme, patientThemeMode) : {};

  // 1. Loading state
  if (loading) return <IntakeLoading />;

  if (completed && !submissionResult) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-xl mx-auto space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {APP_MESSAGES.INTAKE_ALREADY_SUBMITTED}
          </h1>
          {confirmationError ? (
            <>
              <Alert>{APP_MESSAGES.INTAKE_CONFIRMATION_UNAVAILABLE}</Alert>
              <Button variant="secondary" onClick={retryConfirmation}>
                {APP_MESSAGES.RETRY_CONFIRMATION}
              </Button>
            </>
          ) : (
            <p role="status" className="text-sm text-gray-600">
              {APP_MESSAGES.INTAKE_CONFIRMATION_LOADING}
            </p>
          )}
        </div>
      </main>
    );
  }

  // 2. Load Error state
  if (loadError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            <AlertTriangleIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-gray-900">
              Form Unavailable
            </h1>
            <p className="text-xs text-gray-600">
              {loadError ??
                "This intake form is currently not published or does not exist."}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={loading}
            loadingLabel={APP_MESSAGES.RETRYING}
            onClick={retryLoad}
            className="w-full"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // 3. Completed Submission state
  if (submissionResult) {
    return (
      <main
        className="min-h-screen bg-gray-50"
        style={cssVars as React.CSSProperties}
      >
        <SubmissionConfirmation
          formTitle={form.definition.title}
          submissionId={submissionResult.submissionId}
          submittedAt={submissionResult.submittedAt}
          isIdempotentReplay={submissionResult.isIdempotentReplay}
        />
      </main>
    );
  }

  // 4. Active Intake View
  return (
    <main
      data-patient-theme
      className="min-h-screen bg-intake-bg text-intake-text-primary pb-20 selection:bg-blue-100 transition-colors"
      style={cssVars as React.CSSProperties}
    >
      {/* Sticky Progress & Recovery Header */}
      <PatientProgressBar
        answeredCount={answeredCount}
        totalCount={visibleQuestions.length}
        saveStatus={saveStatus}
        saving={isSavingProgress}
        disabled={isSubmitting || isSavingProgress || accessEnded}
        onSaveAndResume={() => {
          void handleSaveProgress();
          setShowRecoveryModal(true);
        }}
        onResumeExisting={() => setShowResumeModal(true)}
        themeMode={patientThemeMode}
        onToggleThemeMode={() =>
          setPatientThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
        }
        onJumpToNextUnanswered={handleJumpToNextUnanswered}
        unansweredRequiredCount={unansweredRequiredQuestions.length}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Form Title & Description Header */}
        <header className="bg-intake-surface border border-intake-border rounded-2xl p-5 sm:p-6 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-intake-text-secondary">
              Patient Intake
            </span>
            {sessionReference && (
              <span className="text-caption font-mono font-medium text-intake-text-secondary bg-intake-bg border border-intake-border px-2 py-0.5 rounded-md">
                Ref: {sessionReference}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-intake-text-primary tracking-tight">
            {form.definition.title}
          </h1>
          {form.definition.description && (
            <p className="text-xs sm:text-sm text-intake-text-secondary leading-relaxed whitespace-pre-wrap">
              {form.definition.description}
            </p>
          )}
        </header>

        {accessEnded && (
          <section className="space-y-3" aria-labelledby="session-ended-title">
            <Alert>
              <h2 id="session-ended-title" className="font-semibold">
                {APP_MESSAGES.INTAKE_SESSION_ENDED_TITLE}
              </h2>
              <p>{APP_MESSAGES.INTAKE_SESSION_ENDED_MESSAGE}</p>
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={isStartingSession}
                onClick={() => setShowResumeModal(true)}
              >
                {APP_MESSAGES.RESUME_INTAKE}
              </Button>
              <Button
                variant="primary"
                loading={isStartingSession}
                loadingLabel={APP_MESSAGES.STARTING_INTAKE}
                onClick={() => void handleStartNewSession()}
              >
                {APP_MESSAGES.START_NEW_INTAKE}
              </Button>
            </div>
          </section>
        )}

        {!accessEnded && saveErrorMessage && (
          <Alert>
            {isConflict
              ? APP_MESSAGES.INTAKE_CONFLICT
              : Object.keys(progressFieldErrors).length ||
                  Object.keys(saveFieldErrors).length
                ? APP_MESSAGES.FIX_ANSWER_ERRORS
                : `${saveErrorMessage} ${APP_MESSAGES.INTAKE_SAVE_FAILED}`}
          </Alert>
        )}

        {!accessEnded &&
          !isConflict &&
          (saveStatus === "error" || isSavingProgress) && (
            <Button
              variant="secondary"
              loading={isSavingProgress}
              loadingLabel={APP_MESSAGES.SAVING}
              disabled={Object.keys(progressFieldErrors).length > 0}
              onClick={() => void handleSaveProgress()}
            >
              {APP_MESSAGES.RETRY_SAVE}
            </Button>
          )}

        {/* Global Submit Error Banner */}
        {submitError && <Alert>{submitError}</Alert>}

        {/* Intake Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {visibleQuestions.length === 0 ? (
            <div className="text-center py-10 bg-intake-surface border border-intake-border rounded-2xl p-6 text-intake-text-secondary text-sm">
              No questions are currently available for this intake.
            </div>
          ) : (
            visibleQuestions.map((q, idx) => (
              <PatientQuestionField
                key={q.id}
                question={q}
                index={idx}
                value={answers[q.id]}
                onChange={(val) => handleAnswerChange(q.id, val)}
                error={
                  progressFieldErrors[q.id] ??
                  fieldErrors[q.id] ??
                  saveFieldErrors[q.id]
                }
                disabled={isSubmitting || accessEnded || isConflict}
              />
            ))
          )}

          {/* Form Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="submit"
              loading={isSubmitting}
              loadingLabel={APP_MESSAGES.SUBMITTING}
              disabled={
                isSubmitting ||
                accessEnded ||
                isConflict ||
                visibleQuestions.length === 0
              }
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold rounded-xl shadow-xs bg-intake-primary-action text-intake-primary-action-fg hover:bg-intake-primary-action-hover cursor-pointer"
            >
              {APP_MESSAGES.SUBMIT_RESPONSES}
            </Button>

            <Button
              disabled={isSubmitting}
              type="button"
              onClick={() => setShowRecoveryModal(true)}
              className="text-xs font-medium text-intake-text-secondary hover:text-intake-text-primary transition-colors py-2 cursor-pointer"
            >
              Need to finish later? View recovery code
            </Button>
          </div>
        </form>
      </div>

      {/* Recovery Code Modal */}
      <RecoveryCodeModal
        recoveryCode={recoveryCode ?? ""}
        saving={isSavingProgress}
        saveError={
          saveErrorMessage ? APP_MESSAGES.INTAKE_SAVE_FAILED : null
        }
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
      />

      {/* Resume Session Modal */}
      <ResumeModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResumeSuccess={handleResumeSuccess}
      />
    </main>
  );
}
