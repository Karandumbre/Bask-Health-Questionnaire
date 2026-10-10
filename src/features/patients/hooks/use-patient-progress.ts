"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APPLICATION } from "@/lib/constants/application";
import {
  DraftAutosave,
  type AutosaveState,
} from "@/features/forms/client/draft-autosave";
import { apiAnswerErrors } from "../client/answer-errors";
import { savePatientProgress } from "../client/patient-api";
import type { PatientAnswers } from "../domain/types";

/** Use the same serialized, revision-aware saves as the editor. */
export function usePatientProgress(slug: string) {
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const slugRef = useRef(slug);
  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);

  const controller = useRef<DraftAutosave<PatientAnswers> | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const [state, setState] = useState<AutosaveState | null>(null);
  const initialize = useCallback(
    (answers: PatientAnswers, revision: number, overrideSlug?: string) => {
      if (overrideSlug) {
        slugRef.current = overrideSlug;
      }
      const targetSlug = overrideSlug ?? slugRef.current;
      setValidationErrors({});
      unsubscribe.current?.();
      controller.current?.pause();
      const next = new DraftAutosave(
        answers,
        revision,
        async (snapshot, expectedRevision, signal) => {
          try {
            const response = await savePatientProgress(
              targetSlug,
              expectedRevision,
              snapshot,
              signal,
            );
            if (!signal.aborted) setValidationErrors({});
            return response.data.sessionRevision;
          } catch (error) {
            if (!signal.aborted) setValidationErrors(apiAnswerErrors(error));
            throw error;
          }
        },
        APPLICATION.autosaveDelayMs,
      );
      controller.current = next;
      setState(next.getSnapshot());
      unsubscribe.current = next.subscribe(() => setState(next.getSnapshot()));
    },
    [],
  );
  useEffect(
    () => () => {
      unsubscribe.current?.();
      controller.current?.pause();
    },
    [slug],
  );
  const update = useCallback((answers: PatientAnswers) => {
    setValidationErrors({});
    controller.current?.update(answers);
  }, []);
  const saveNow = useCallback(
    async () => (await controller.current?.flush()) ?? false,
    [],
  );
  const hasConflict = useCallback(
    () => controller.current?.getSnapshot().status === "conflict",
    [],
  );
  const pause = useCallback(() => controller.current?.pause(), []);
  return {
    state,
    validationErrors,
    initialize,
    update,
    saveNow,
    pause,
    hasConflict,
  };
}
