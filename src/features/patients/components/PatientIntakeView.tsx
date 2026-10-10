"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type { FormDefinition } from "@/features/forms/domain/types";
import type { ThemeDefinition } from "@/features/themes/domain/theme-types";
import { themeToCssVariables } from "@/features/themes/domain/css-variables";
import {
  fetchPublishedForm,
  getActiveSession,
  startPatientSession,
  submitPatientSession,
  isPatientSessionEnded,
  type ActivePatientSession,
} from "../client/patient-api";
import { getVisibleQuestions, pruneHiddenAnswers } from "../domain/visibility";
import {
  validateSessionSubmission,
  validateSessionProgress,
} from "../domain/validation";
import type { PatientAnswers, CanonicalAnswer } from "../domain/types";
import { PatientQuestionField } from "./PatientQuestionField";
import { PatientProgressBar } from "./PatientProgressBar";
import { RecoveryCodeModal } from "./RecoveryCodeModal";
import { ResumeModal } from "./ResumeModal";
import { SubmissionConfirmation } from "./SubmissionConfirmation";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { Alert } from "@/components/ui/alert";
import { IntakeLoading } from "./IntakeLoading";
import { usePatientProgress } from "../hooks/use-patient-progress";
import { Button } from "@/components/ui/button";
import { apiAnswerErrors } from "../client/answer-errors";
import { ApiError, apiErrorMessage } from "@/lib/http/api-client";

interface PatientIntakeViewProps {
  slug: string;
}

export function PatientIntakeView({ slug }: PatientIntakeViewProps) {
  // Form definition state
  const [form, setForm] = useState<{
    publicSlug: string;
    versionNumber: number;
    definition: FormDefinition;
    theme: ThemeDefinition;
  } | null>(null);

  // Session state
  const [sessionReference, setSessionReference] = useState<string>("");
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [answers, setAnswers] = useState<PatientAnswers>({});

  // UI state
  const [activeSlug, setActiveSlug] = useState<string>(slug);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const {
    state: progressState,
    validationErrors: saveFieldErrors,
    initialize: initializeProgress,
    update: updateProgress,
    saveNow: saveProgressNow,
    pause: pauseProgress,
    hasConflict,
    hasSessionEnded,
    hasSessionCompleted,
    sessionCompleted: progressSessionCompleted,
    sessionEnded: progressSessionEnded,
  } = usePatientProgress(activeSlug);
  const saveStatus = progressSessionEnded
    ? "idle"
    : progressState?.status === "saving"
      ? "saving"
      : progressState?.status === "saved"
        ? "saved"
        : progressState?.status === "failed" ||
            progressState?.status === "conflict"
          ? "error"
          : "idle";
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const completed = sessionCompleted || progressSessionCompleted;
  const accessEnded = sessionEnded || progressSessionEnded || completed;
  const [confirmationError, setConfirmationError] = useState(false);
  const [confirmationAttempt, setConfirmationAttempt] = useState(0);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const submitBusy = useRef(false);
  const saveBusy = useRef(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    submittedAt: string | Date;
    isIdempotentReplay: boolean;
  } | null>(null);

  // Modals
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);

  const answersRef = useRef<PatientAnswers>({});
  const showCompletedSession = useCallback(
    (data: ActivePatientSession) => {
      if (data.status !== "completed")
        throw new Error(APP_MESSAGES.INTAKE_CONFIRMATION_UNAVAILABLE);
      pauseProgress();
      setSessionCompleted(true);
      if (!data.submission)
        throw new Error(APP_MESSAGES.INTAKE_CONFIRMATION_UNAVAILABLE);
      setForm({
        publicSlug: data.publicSlug,
        versionNumber: data.versionNumber,
        definition: data.definition,
        theme: data.theme,
      });
      setSubmissionResult({ ...data.submission, isIdempotentReplay: true });
      setShowRecoveryModal(false);
      setShowResumeModal(false);
    },
    [pauseProgress],
  );

  useEffect(() => {
    if (!completed || submissionResult) return;
    const controller = new AbortController();
    void getActiveSession(activeSlug, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (!response.data.active)
          throw new Error(APP_MESSAGES.INTAKE_CONFIRMATION_UNAVAILABLE);
        showCompletedSession(response.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfirmationError(true);
      });
    return () => controller.abort();
  }, [
    completed,
    submissionResult,
    activeSlug,
    confirmationAttempt,
    showCompletedSession,
  ]);

  // Initialize form and session
  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    async function init() {
      try {
        setLoading(true);
        setLoadError(null);

        // Inspect the capability first so a completed/pinned session owns its view.
        const sessionRes = await getActiveSession(slug, abortController.signal);
        if (isCancelled) return;

        if (sessionRes.data.active) {
          if (sessionRes.data.status === "completed") {
            showCompletedSession(sessionRes.data);
            return;
          }

          // Resume active session
          setSessionReference(sessionRes.data.sessionReference);
          initializeProgress(
            sessionRes.data.currentAnswers as PatientAnswers,
            sessionRes.data.sessionRevision,
            sessionRes.data.publicSlug,
          );
          answersRef.current = sessionRes.data.currentAnswers as PatientAnswers;
          setForm({
            publicSlug: sessionRes.data.publicSlug,
            versionNumber: sessionRes.data.versionNumber,
            definition: sessionRes.data.definition,
            theme: sessionRes.data.theme,
          });
          setAnswers(sessionRes.data.currentAnswers as PatientAnswers);
        } else {
          const formRes = await fetchPublishedForm(
            slug,
            abortController.signal,
          );
          if (isCancelled) return;
          setForm(formRes.data);
          if (sessionRes.data.sessionEnded) {
            setSessionEnded(true);
            return;
          }
          // Initialize fresh session
          const startRes = await startPatientSession(
            slug,
            abortController.signal,
          );
          if (isCancelled) return;

          setSessionReference(startRes.data.sessionReference);
          setRecoveryCode(startRes.data.recoveryCode);
          initializeProgress(
            startRes.data.currentAnswers as PatientAnswers,
            startRes.data.sessionRevision,
          );
          answersRef.current = startRes.data.currentAnswers as PatientAnswers;
          setForm({
            publicSlug: startRes.data.publicSlug,
            versionNumber: startRes.data.versionNumber,
            definition: startRes.data.definition,
            theme: startRes.data.theme,
          });
          setAnswers(startRes.data.currentAnswers as PatientAnswers);
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError(apiErrorMessage(err, APP_MESSAGES.INTAKE_LOAD_FAILED));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [slug, loadAttempt, initializeProgress, showCompletedSession]);

  // Keep answer updates outside React state updaters so replay cannot send writes.
  const handleAnswerChange = useCallback(
    (questionId: string, value: unknown) => {
      if (
        !form ||
        submitBusy.current ||
        accessEnded ||
        progressState?.status === "conflict"
      )
        return;
      const updated = { ...answersRef.current };
      if (value === undefined || value === null) delete updated[questionId];
      else updated[questionId] = value as CanonicalAnswer;
      const next = pruneHiddenAnswers(updated, form.definition.questions);
      answersRef.current = next;
      setAnswers(next);
      updateProgress(next);
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    },
    [form, updateProgress, progressState?.status, accessEnded],
  );

  const handleSaveProgress = async () => {
    if (saveBusy.current || submitBusy.current || accessEnded) return;
    saveBusy.current = true;
    setIsSavingProgress(true);
    try {
      await saveProgressNow();
    } finally {
      saveBusy.current = false;
      setIsSavingProgress(false);
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form ||
      submitBusy.current ||
      accessEnded ||
      progressState?.status === "conflict"
    )
      return;

    // Validate submission client-side
    const validation = validateSessionSubmission(
      answers,
      form.definition.questions,
    );

    if (!validation.valid) {
      const errMap: Record<string, string> = {};
      for (const err of validation.errors) {
        errMap[err.questionId] = err.issue;
      }
      setFieldErrors(errMap);
      setSubmitError(APP_MESSAGES.INTAKE_VALIDATION_FAILED);

      // Scroll to the first error
      const firstErrorQuestionId = validation.errors[0]?.questionId;
      if (firstErrorQuestionId) {
        const el = document.querySelector(
          `[data-question-id="${firstErrorQuestionId}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector<HTMLElement>("input, textarea, select")?.focus();
      }
      return;
    }

    submitBusy.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Finish any in-flight write before final submission. A failed progress
      // save does not discard answers; the final endpoint validates them again.
      await saveProgressNow();
      if (hasSessionEnded() || hasSessionCompleted()) return;
      if (hasConflict()) {
        setSubmitError(APP_MESSAGES.INTAKE_CONFLICT);
        return;
      }
      const response = await submitPatientSession(
        activeSlug,
        validation.sanitizedAnswers,
      );
      pauseProgress();
      setSubmissionResult({
        submissionId: response.data.submissionId,
        submittedAt: response.data.submittedAt,
        isIdempotentReplay: response.data.isIdempotentReplay,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "SESSION_COMPLETED") {
        pauseProgress();
        setSessionCompleted(true);
        return;
      }
      if (isPatientSessionEnded(err)) {
        pauseProgress();
        setSessionEnded(true);
      }
      setFieldErrors(apiAnswerErrors(err));
      setSubmitError(apiErrorMessage(err, APP_MESSAGES.INTAKE_SUBMIT_FAILED));
    } finally {
      submitBusy.current = false;
      setIsSubmitting(false);
    }
  };

  // Resume session success callback
  const handleResumeSuccess = (data: {
    sessionId: string;
    sessionReference: string;
    newRecoveryCode: string;
    currentAnswers: PatientAnswers;
    sessionRevision: number;
    publicSlug: string;
    versionNumber: number;
    definition: FormDefinition;
    theme: ThemeDefinition;
  }) => {
    if (data.publicSlug && data.publicSlug !== activeSlug) {
      setActiveSlug(data.publicSlug);
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(null, "", `/intake/${data.publicSlug}`);
      }
    }
    setForm({
      publicSlug: data.publicSlug,
      versionNumber: data.versionNumber,
      definition: data.definition,
      theme: data.theme,
    });
    setSessionEnded(false);
    setSessionReference(data.sessionReference);
    setRecoveryCode(data.newRecoveryCode);
    setAnswers(data.currentAnswers);
    answersRef.current = data.currentAnswers;
    initializeProgress(
      data.currentAnswers,
      data.sessionRevision,
      data.publicSlug,
    );
    setFieldErrors({});
    setSubmitError(null);
  };

  const handleStartNewSession = async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);
    setSubmitError(null);
    try {
      const response = await startPatientSession(activeSlug);
      handleResumeSuccess({
        ...response.data,
        currentAnswers: response.data.currentAnswers as PatientAnswers,
        newRecoveryCode: response.data.recoveryCode,
      });
    } catch (error) {
      setSubmitError(apiErrorMessage(error, APP_MESSAGES.INTAKE_LOAD_FAILED));
    } finally {
      setIsStartingSession(false);
    }
  };

  const [patientThemeMode, setPatientThemeMode] = useState<"light" | "dark">(
    "light",
  );

  // Filter visible questions in configured order
  const visibleQuestions = useMemo(() => {
    if (!form) return [];
    return getVisibleQuestions(form.definition.questions, answers);
  }, [form, answers]);

  const progressFieldErrors = useMemo(
    () =>
      form
        ? Object.fromEntries(
            validateSessionProgress(
              answers,
              form.definition.questions,
            ).errors.map((error) => [error.questionId, error.issue]),
          )
        : {},
    [answers, form],
  );

  // Count answered visible questions
  const answeredCount = useMemo(() => {
    let count = 0;
    for (const q of visibleQuestions) {
      const val = answers[q.id];
      if (val === undefined || val === null) continue;
      if (typeof val === "string" && val.trim().length === 0) continue;
      if (Array.isArray(val) && val.length === 0) continue;
      count++;
    }
    return count;
  }, [visibleQuestions, answers]);

  // Calculate unanswered required questions for quick jump navigation
  const unansweredRequiredQuestions = useMemo(() => {
    return visibleQuestions.filter((q) => {
      if (!q.required) return false;
      const val = answers[q.id];
      if (val === undefined || val === null) return true;
      if (typeof val === "string" && val.trim().length === 0) return true;
      if (Array.isArray(val) && val.length === 0) return true;
      if (q.type === "checkbox" && val !== true) return true;
      return false;
    });
  }, [visibleQuestions, answers]);

  const handleJumpToNextUnanswered = useCallback(() => {
    const nextQ = unansweredRequiredQuestions[0];
    if (!nextQ) return;
    const el = document.querySelector(`[data-question-id="${nextQ.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLElement>(
        "input, textarea, select, button",
      );
      input?.focus();
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
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmationError(false);
                  setConfirmationAttempt((attempt) => attempt + 1);
                }}
              >
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
            !
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
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
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

        {!accessEnded && progressState?.errorMessage && (
          <Alert>
            {progressState.status === "conflict"
              ? APP_MESSAGES.INTAKE_CONFLICT
              : Object.keys(progressFieldErrors).length ||
                  Object.keys(saveFieldErrors).length
                ? APP_MESSAGES.FIX_ANSWER_ERRORS
                : `${progressState.errorMessage} ${APP_MESSAGES.INTAKE_SAVE_FAILED}`}
          </Alert>
        )}
        {!accessEnded &&
          (saveStatus === "error" || isSavingProgress) &&
          progressState?.status !== "conflict" && (
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
                disabled={
                  isSubmitting ||
                  accessEnded ||
                  progressState?.status === "conflict"
                }
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
                progressState?.status === "conflict" ||
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
        recoveryCode={recoveryCode}
        saving={isSavingProgress}
        saveError={
          progressState?.errorMessage ? APP_MESSAGES.INTAKE_SAVE_FAILED : null
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
