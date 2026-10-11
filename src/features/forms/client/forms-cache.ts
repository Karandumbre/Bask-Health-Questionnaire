import { APPLICATION } from "@/lib/constants/application";
import type { FormListItem } from "../domain/dashboard-types";

const entries = new Map<string, { forms: FormListItem[]; fetchedAt: number }>();
let generation = 0;

export function clearFormsCache() {
  generation++;
  entries.clear();
}

export function readFormsCache(key: string) {
  const entry = entries.get(key);
  return (
    entry && {
      ...entry,
      fresh: Date.now() - entry.fetchedAt < APPLICATION.formsCacheFreshMs,
    }
  );
}

export async function fetchAndCacheForms(
  key: string,
  load: () => Promise<FormListItem[]>,
  signal: AbortSignal,
) {
  const startedGeneration = generation;
  const forms = await load();
  if (signal.aborted || startedGeneration !== generation) return null;
  entries.set(key, { forms, fetchedAt: Date.now() });
  return forms;
}
