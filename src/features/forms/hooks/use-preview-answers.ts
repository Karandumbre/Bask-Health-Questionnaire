"use client";

import { useMemo, useState } from "react";
import { pruneHiddenAnswers } from "@/features/patients/domain/visibility";
import type {
  CanonicalAnswer,
  PatientAnswers,
} from "@/features/patients/domain/types";
import {
  validateSessionProgress,
  validateSessionSubmission,
} from "@/features/patients/domain/validation";
import type { Question } from "../domain/types";

export function usePreviewAnswers(questions: Question[]) {
  const [answers, setAnswers] = useState<PatientAnswers>({});
  const visibleAnswers = useMemo(
    () => pruneHiddenAnswers(answers, questions),
    [answers, questions],
  );
  const updateAnswer = (
    questionId: string,
    value: CanonicalAnswer | undefined,
  ) => {
    setAnswers((previous) => {
      const next = pruneHiddenAnswers(previous, questions);
      if (value === undefined) delete next[questionId];
      else next[questionId] = value;
      return pruneHiddenAnswers(next, questions);
    });
  };
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const validation = useMemo(
    () =>
      (submissionAttempted
        ? validateSessionSubmission
        : validateSessionProgress)(visibleAnswers, questions),
    [visibleAnswers, questions, submissionAttempted],
  );
  const validateSubmission = () => {
    setSubmissionAttempted(true);
    return validateSessionSubmission(visibleAnswers, questions);
  };
  return {
    answers: visibleAnswers,
    updateAnswer,
    validation,
    submissionAttempted,
    validateSubmission,
  };
}
