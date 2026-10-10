export interface FocusQuestionOptions {
  container?: HTMLElement | null;
  scrollIntoView?: boolean;
}

/**
 * Finds a question element by ID within the specified container (defaulting to document),
 * optionally scrolls it into view, and focuses its primary interactive input.
 */
export function focusQuestion(
  questionId: string,
  options?: FocusQuestionOptions,
): boolean {
  if (typeof document === "undefined") return false;
  const root = options?.container ?? document;
  const selector = `[data-question-id="${questionId}"]`;
  const card = root.querySelector<HTMLElement>(selector);
  if (!card) return false;

  if (options?.scrollIntoView !== false) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const control = card.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled), [tabindex="0"]',
  );
  control?.focus();
  return Boolean(control);
}
