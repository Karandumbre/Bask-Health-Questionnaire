import type { Question, SingleSelectQuestion } from "./types";
import type { FormValidationError } from "./validation";

export function getEligibleConditionParents(
  questions: Question[],
  questionId: string,
): SingleSelectQuestion[] {
  const index = questions.findIndex((q) => q.id === questionId);
  return questions.filter(
    (q, i): q is SingleSelectQuestion =>
      i < index &&
      q.type === "single_select" &&
      q.required &&
      q.visibility === null,
  );
}

export function validateQuestionCondition(
  questions: Question[],
  question: Question,
): FormValidationError[] {
  if (!question.visibility) return [];
  const { parentQuestionId, equalsOptionId } = question.visibility;
  const index = questions.findIndex((q) => q.id === question.id);
  const parentIndex = questions.findIndex((q) => q.id === parentQuestionId);
  const parent = questions[parentIndex];
  const errors: FormValidationError[] = [];
  const add = (code: string, issue: string) =>
    errors.push({ questionId: question.id, field: "visibility", code, issue });
  if (!parent) {
    add(
      "MISSING_PARENT_QUESTION",
      "Referenced parent question no longer exists.",
    );
    return errors;
  }
  if (parentIndex >= index) {
    add(
      "FORWARD_OR_SELF_DEPENDENCY",
      "Parent question must appear before this question.",
    );
    return errors;
  }
  if (parent.type !== "single_select")
    add(
      "INVALID_PARENT_TYPE",
      "Parent question must be a single-choice field.",
    );
  if (!parent.required)
    add("PARENT_NOT_REQUIRED", "Parent question must be marked Required.");
  if (parent.visibility !== null)
    add(
      "NESTED_CONDITION_FORBIDDEN",
      "Parent must be unconditional; nested conditions are forbidden.",
    );
  if (
    parent.type === "single_select" &&
    !parent.options.some((opt) => opt.id === equalsOptionId)
  )
    add(
      "MISSING_PARENT_OPTION",
      "Referenced option no longer exists in parent question.",
    );
  return errors;
}
