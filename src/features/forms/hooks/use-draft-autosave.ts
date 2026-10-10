"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DraftAutosave } from "../client/draft-autosave";
import { saveFormDraft, type DraftSnapshot } from "../client/forms-api";

export function useDraftAutosave(formId: string, initialRevision: number, draft: DraftSnapshot) {
  const snapshot = useMemo(() => ({ definition: draft.definition, theme: draft.theme }), [draft.definition, draft.theme]);
  const [autosave] = useState(() => new DraftAutosave(snapshot, initialRevision,
    (snapshot, revision, signal) => saveFormDraft(formId, snapshot, revision, signal),
    800, (left, right) => left.definition === right.definition && left.theme === right.theme,
  ));
  // Update before another event (such as Save) can read an older render's draft.
  useLayoutEffect(() => { autosave.update(snapshot); }, [autosave, snapshot]);
  useEffect(() => {
    autosave.resume();
    return () => autosave.pause();
  }, [autosave]);
  const state = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot, autosave.getSnapshot);
  return { autosave, ...state };
}
