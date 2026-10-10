"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APPLICATION } from "@/lib/constants/application";
import {
  DraftAutosave,
  type AutosaveState,
} from "@/features/forms/client/draft-autosave";
import { savePatientProgress } from "../client/patient-api";
import type { PatientAnswers } from "../domain/types";

/** Use the same serialized, revision-aware saves as the editor. */
export function usePatientProgress(slug: string) {
  const controller = useRef<DraftAutosave<PatientAnswers> | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const [state, setState] = useState<AutosaveState | null>(null);
  const initialize = useCallback(
    (answers: PatientAnswers, revision: number) => {
      unsubscribe.current?.();
      controller.current?.pause();
      const next = new DraftAutosave(
        answers,
        revision,
        async (snapshot, expectedRevision, signal) => {
          const response = await savePatientProgress(
            slug,
            expectedRevision,
            snapshot,
            signal,
          );
          return response.data.sessionRevision;
        },
        APPLICATION.autosaveDelayMs,
      );
      controller.current = next;
      setState(next.getSnapshot());
      unsubscribe.current = next.subscribe(() => setState(next.getSnapshot()));
    },
    [slug],
  );
  useEffect(
    () => () => {
      unsubscribe.current?.();
      controller.current?.pause();
    },
    [slug],
  );
  const update = useCallback(
    (answers: PatientAnswers) => controller.current?.update(answers),
    [],
  );
  const saveNow = useCallback(
    async () => (await controller.current?.flush()) ?? false,
    [],
  );
  const hasConflict = useCallback(
    () => controller.current?.getSnapshot().status === "conflict",
    [],
  );
  const pause = useCallback(() => controller.current?.pause(), []);
  return { state, initialize, update, saveNow, pause, hasConflict };
}
