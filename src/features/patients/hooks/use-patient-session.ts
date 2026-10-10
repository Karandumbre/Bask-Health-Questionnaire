"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { ApiError, apiErrorMessage } from "@/lib/http/api-client";
import { focusQuestion } from "@/lib/dom/focus-question";
import { apiAnswerErrors } from "../client/answer-errors";
import {
  getActiveSession,
  fetchPublishedForm,
  startPatientSession,
  submitPatientSession,
  isPatientSessionEnded,
  type ActivePatientSession,
  type BasePatientSession,
  type ResumeSessionData,
} from "../client/patient-api";
import {
  validateSessionSubmission,
  validateSessionProgress,
  validationErrorsToMap,
} from "../domain/validation";
import { pruneHiddenAnswers } from "../domain/visibility";
import { usePatientProgress } from "./use-patient-progress";
import type { PatientAnswers, CanonicalAnswer } from "../domain/types";
import type {
  FormDefinition,
  ThemeDefinition,
} from "@/features/forms/domain/types";

export interface LoadedIntakeForm {
  publicSlug: string;
  versionNumber: number;
  definition: FormDefinition;
  theme: ThemeDefinition;
}

export function usePatientSession(initialSlug: string) {
  const [activeSlug, setActiveSlug] = useState<string>(initialSlug);
  const [form, setForm] = useState<LoadedIntakeForm | null>(null);
  const [sessionReference, setSessionReference] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PatientAnswers>({});
  const answersRef = useRef<PatientAnswers>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState<number>(0);

  const [sessionEnded, setSessionEnded] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [confirmationError, setConfirmationError] = useState<boolean>(false);
  const [confirmationAttempt, setConfirmationAttempt] = useState<number>(0);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [isSavingProgress, setIsSavingProgress] = useState<boolean>(false);

  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    submittedAt: string | Date;
    isIdempotentReplay: boolean;
  } | null>(null);

  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);

  const submitBusy = useRef(false);
  const saveBusy = useRef(false);

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

  const completed = sessionCompleted || progressSessionCompleted;
  const accessEnded = sessionEnded || progressSessionEnded || completed;
  const isConflict = progressState?.status === "conflict" || hasConflict();
  const saveErrorMessage = progressState?.errorMessage ?? null;

  const saveStatus: "idle" | "saving" | "saved" | "error" = progressSessionEnded
    ? "idle"
    : progressState?.status === "saving"
      ? "saving"
      : progressState?.status === "saved"
        ? "saved"
        : progressState?.status === "failed" ||
            progressState?.status === "conflict"
          ? "error"
          : "idle";

  /**
   * Centralizes adoption of any active/resumed/started session state.
   */
  const adoptActiveSession = useCallback(
    (session: BasePatientSession, options?: { recoveryCode?: string }) => {
      setForm({
        publicSlug: session.publicSlug,
        versionNumber: session.versionNumber,
        definition: session.definition,
        theme: session.theme,
      });
      setSessionEnded(false);
      setSessionReference(session.sessionReference);
      if (options?.recoveryCode) {
        setRecoveryCode(options.recoveryCode);
      }
      setAnswers(session.currentAnswers);
      answersRef.current = session.currentAnswers;
      initializeProgress(
        session.currentAnswers,
        session.sessionRevision,
        session.publicSlug,
      );
      setFieldErrors({});
      setSubmitError(null);
    },
    [initializeProgress],
  );

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

  // Poll/fetch completed session details if session was flagged completed
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

  // Primary session initialization
  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    async function init() {
      try {
        setLoading(true);
        setLoadError(null);

        // Inspect capability first
        const sessionRes = await getActiveSession(
          initialSlug,
          abortController.signal,
        );
        if (isCancelled) return;

        if (sessionRes.data.active) {
          if (sessionRes.data.status === "completed") {
            showCompletedSession(sessionRes.data);
            return;
          }
          adoptActiveSession(sessionRes.data);
        } else {
          const formRes = await fetchPublishedForm(
            initialSlug,
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
            initialSlug,
            abortController.signal,
          );
          if (isCancelled) return;

          adoptActiveSession(startRes.data, {
            recoveryCode: startRes.data.recoveryCode,
          });
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
  }, [initialSlug, loadAttempt, adoptActiveSession, showCompletedSession]);

  const handleAnswerChange = useCallback(
    (questionId: string, value: CanonicalAnswer | undefined) => {
      if (
        !form ||
        submitBusy.current ||
        accessEnded ||
        isConflict
      )
        return;

      const updated = { ...answersRef.current };
      if (value === undefined || value === null) delete updated[questionId];
      else updated[questionId] = value;

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
    [form, updateProgress, isConflict, accessEnded],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form ||
      submitBusy.current ||
      accessEnded ||
      isConflict
    )
      return;

    const validation = validateSessionSubmission(
      answers,
      form.definition.questions,
    );

    if (!validation.valid) {
      const errMap = validationErrorsToMap(validation.errors);
      setFieldErrors(errMap);
      setSubmitError(APP_MESSAGES.INTAKE_VALIDATION_FAILED);

      const firstErrorQuestionId = validation.errors[0]?.questionId;
      if (firstErrorQuestionId) {
        focusQuestion(firstErrorQuestionId);
      }
      return;
    }

    submitBusy.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await saveProgressNow();
      if (hasSessionEnded() || hasSessionCompleted()) return;
      if (isConflict) {
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

  const handleResumeSuccess = (data: ResumeSessionData) => {
    if (data.publicSlug && data.publicSlug !== activeSlug) {
      setActiveSlug(data.publicSlug);
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(null, "", `/intake/${data.publicSlug}`);
      }
    }
    adoptActiveSession(data, { recoveryCode: data.newRecoveryCode });
  };

  const handleStartNewSession = async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);
    setSubmitError(null);
    try {
      const response = await startPatientSession(activeSlug);
      adoptActiveSession(response.data, {
        recoveryCode: response.data.recoveryCode,
      });
    } catch (error) {
      setSubmitError(apiErrorMessage(error, APP_MESSAGES.INTAKE_LOAD_FAILED));
    } finally {
      setIsStartingSession(false);
    }
  };

  const progressFieldErrors = useMemo(
    () =>
      form
        ? validationErrorsToMap(
            validateSessionProgress(answers, form.definition.questions).errors,
          )
        : {},
    [answers, form],
  );

  return {
    activeSlug,
    form,
    answers,
    sessionReference,
    recoveryCode,
    loading,
    loadError,
    sessionEnded,
    sessionCompleted,
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
    retryLoad: () => setLoadAttempt((prev) => prev + 1),
    retryConfirmation: () => setConfirmationAttempt((prev) => prev + 1),
  };
}
