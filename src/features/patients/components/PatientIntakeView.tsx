"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type { FormDefinition } from "@/features/forms/domain/types";
import type { ThemeDefinition } from "@/features/themes/domain/theme-types";
import { themeToCssVariables } from "@/features/themes/domain/css-variables";
import {
  fetchPublishedForm,
  getActiveSession,
  startPatientSession,
  savePatientProgress,
  submitPatientSession,
} from "../client/patient-api";
import { getVisibleQuestions, pruneHiddenAnswers } from "../domain/visibility";
import { validateSessionSubmission } from "../domain/validation";
import type { PatientAnswers, CanonicalAnswer } from "../domain/types";
import { PatientQuestionField } from "./PatientQuestionField";
import { PatientProgressBar } from "./PatientProgressBar";
import { RecoveryCodeModal } from "./RecoveryCodeModal";
import { ResumeModal } from "./ResumeModal";
import { SubmissionConfirmation } from "./SubmissionConfirmation";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/http/api-client";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
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

  // Autosave coordination
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRevisionRef = useRef<number>(0);

  // Initialize form and session
  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    async function init() {
      try {
        setLoading(true);
        setLoadError(null);

        // 1. Fetch published form definition
        const formRes = await fetchPublishedForm(slug, abortController.signal);
        if (isCancelled) return;

        setForm(formRes.data);

        // 2. Check active session capability
        const sessionRes = await getActiveSession(slug, abortController.signal);
        if (isCancelled) return;

        if (sessionRes.data.active) {
          // Resume active session
          setSessionReference(sessionRes.data.sessionReference);
          sessionRevisionRef.current = sessionRes.data.sessionRevision;
          setAnswers(sessionRes.data.currentAnswers as PatientAnswers);
          setSaveStatus("saved");
        } else {
          // Initialize fresh session
          const startRes = await startPatientSession(
            slug,
            abortController.signal,
          );
          if (isCancelled) return;

          setSessionReference(startRes.data.sessionReference);
          setRecoveryCode(startRes.data.recoveryCode);
          sessionRevisionRef.current = startRes.data.sessionRevision;
          setAnswers(startRes.data.currentAnswers as PatientAnswers);
          setSaveStatus("idle");
        }
      } catch (err) {
        if (!isCancelled) {
          setLoadError(
            apiErrorMessage(
              err,
              "Unable to load intake form. Please check the URL or try again later.",
            ),
          );
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
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [slug]);

  // Execute debounced progress save
  const triggerDebouncedSave = useCallback(
    (currentRevision: number, nextAnswers: PatientAnswers) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      setSaveStatus("saving");

      autosaveTimerRef.current = setTimeout(async () => {
        try {
          const res = await savePatientProgress(
            slug,
            currentRevision,
            nextAnswers,
          );
          sessionRevisionRef.current = res.data.sessionRevision;
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      }, 750);
    },
    [slug],
  );

  // Field change handler
  const handleAnswerChange = useCallback(
    (questionId: string, value: unknown) => {
      if (!form) return;

      setAnswers((prev) => {
        const next: PatientAnswers = {
          ...prev,
          [questionId]: value as CanonicalAnswer,
        };
        // Prune hidden answers immediately when a question change causes dependent questions to hide
        const pruned = pruneHiddenAnswers(next, form.definition.questions);

        // Schedule debounced CAS save with the latest revision
        triggerDebouncedSave(sessionRevisionRef.current, pruned);
        return pruned;
      });

      // Clear field-level error
      setFieldErrors((prev) => {
        if (!prev[questionId]) return prev;
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });
    },
    [form, triggerDebouncedSave],
  );

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || isSubmitting) return;

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
      setSubmitError(
        "Please resolve the highlighted questions before submitting your intake.",
      );

      // Scroll to the first error
      const firstErrorQuestionId = validation.errors[0]?.questionId;
      if (firstErrorQuestionId) {
        const el = document.querySelector(
          `[data-question-id="${firstErrorQuestionId}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Cancel any pending debounced autosave before submitting
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    try {
      const response = await submitPatientSession(
        slug,
        validation.sanitizedAnswers,
      );
      setSubmissionResult({
        submissionId: response.data.submissionId,
        submittedAt: response.data.submittedAt,
        isIdempotentReplay: response.data.isIdempotentReplay,
      });
    } catch (err) {
      setSubmitError(
        apiErrorMessage(
          err,
          "Failed to submit intake responses. Please verify your connection and try again.",
        ),
      );
    } finally {
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
  }) => {
    setSessionReference(data.sessionReference);
    setRecoveryCode(data.newRecoveryCode);
    setAnswers(data.currentAnswers);
    sessionRevisionRef.current = data.sessionRevision;
    setFieldErrors({});
    setSubmitError(null);
    setSaveStatus("saved");
  };

  // Filter visible questions in configured order
  const visibleQuestions = useMemo(() => {
    if (!form) return [];
    return getVisibleQuestions(form.definition.questions, answers);
  }, [form, answers]);

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

  // CSS variables from published theme
  const cssVars = form ? themeToCssVariables(form.theme, "light") : {};

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-600">
            Loading intake form...
          </p>
        </div>
      </div>
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
            onClick={() => window.location.reload()}
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
      className="min-h-screen bg-gray-50/50 pb-20 selection:bg-blue-100"
      style={cssVars as React.CSSProperties}
    >
      {/* Sticky Progress & Recovery Header */}
      <PatientProgressBar
        answeredCount={answeredCount}
        totalCount={visibleQuestions.length}
        saveStatus={saveStatus}
        onSaveAndResume={() => setShowRecoveryModal(true)}
        onResumeExisting={() => setShowResumeModal(true)}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Form Title & Description Header */}
        <header className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400">
              Patient Intake
            </span>
            {sessionReference && (
              <span className="text-caption font-mono font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                Ref: {sessionReference}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {form.definition.title}
          </h1>
          {form.definition.description && (
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {form.definition.description}
            </p>
          )}
        </header>

        {/* Global Submit Error Banner */}
        {submitError && (
          <div
            role="alert"
            className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 shadow-2xs"
          >
            <span className="font-bold text-sm leading-none">⚠️</span>
            <div className="flex-1">{submitError}</div>
          </div>
        )}

        {/* Intake Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {visibleQuestions.length === 0 ? (
            <div className="text-center py-10 bg-white border border-gray-200 rounded-2xl p-6 text-gray-500 text-sm">
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
                error={fieldErrors[q.id]}
                disabled={isSubmitting}
              />
            ))
          )}

          {/* Form Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || visibleQuestions.length === 0}
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Submit Responses"}
            </Button>

            <button
              type="button"
              onClick={() => setShowRecoveryModal(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors py-2 cursor-pointer"
            >
              Need to finish later? View recovery code
            </button>
          </div>
        </form>
      </div>

      {/* Recovery Code Modal */}
      <RecoveryCodeModal
        recoveryCode={
          recoveryCode || "Session active. Code available upon saving progress."
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
