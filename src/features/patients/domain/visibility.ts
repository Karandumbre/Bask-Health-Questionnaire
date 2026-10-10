import { Question } from "@/features/forms/domain/types";
import { PatientAnswers } from "./types";

/**
 * Pure evaluation of whether a specific question is visible,
 * given the current patient answers and questions configuration.
 */
export function evaluateQuestionVisibility(
  question: Question,
  answers: PatientAnswers,
  questionMap: Map<string, Question>
): boolean {
  // Unconditional questions are always visible
  if (!question.visibility) {
    return true;
  }

  const { parentQuestionId, equalsOptionId } = question.visibility;
  const parent = questionMap.get(parentQuestionId);

  // If parent doesn't exist, cannot be visible
  if (!parent) {
    return false;
  }

  // If parent itself has conditions and is hidden, child is hidden
  if (parent.visibility && !evaluateQuestionVisibility(parent, answers, questionMap)) {
    return false;
  }

  const parentAnswer = answers[parentQuestionId];

  // Parent answer must match the target option ID
  if (typeof parentAnswer === "string" && parentAnswer === equalsOptionId) {
    return true;
  }

  return false;
}

/**
 * Returns all currently visible questions in their defined order.
 */
export function getVisibleQuestions(
  questions: Question[],
  answers: PatientAnswers
): Question[] {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  return questions.filter((q) => evaluateQuestionVisibility(q, answers, questionMap));
}

/**
 * Prunes answers for any question that is currently hidden or unknown.
 * Pure function: returns a new object with only visible answers retained.
 *
 * This fulfills the invariant:
 * "When a parent answer changes to no longer match, newly hidden answers
 * are removed immediately in memory and on the server."
 */
export function pruneHiddenAnswers(
  answers: PatientAnswers,
  questions: Question[]
): PatientAnswers {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  const pruned: PatientAnswers = {};

  for (const q of questions) {
    const isVisible = evaluateQuestionVisibility(q, answers, questionMap);
    const ans = answers[q.id];
    if (isVisible && ans !== undefined) {
      pruned[q.id] = ans;
    }
  }

  return pruned;
}
