import { APP_MESSAGES } from "@/lib/constants/messages";
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
      APP_MESSAGES.REFERENCED_PARENT_QUESTION_NO_LONGER_EXISTS,
    );
    return errors;
  }
  if (parentIndex >= index) {
    add(
      "FORWARD_OR_SELF_DEPENDENCY",
      APP_MESSAGES.PARENT_QUESTION_MUST_APPEAR_BEFORE_THIS_QUESTION,
    );
    return errors;
  }
  if (parent.type !== "single_select")
    add(
      "INVALID_PARENT_TYPE",
      APP_MESSAGES.PARENT_QUESTION_MUST_BE_A_SINGLE_CHOICE_FIELD,
    );
  if (!parent.required)
    add(
      "PARENT_NOT_REQUIRED",
      APP_MESSAGES.PARENT_QUESTION_MUST_BE_MARKED_REQUIRED,
    );
  if (parent.visibility !== null)
    add(
      "NESTED_CONDITION_FORBIDDEN",
      APP_MESSAGES.PARENT_MUST_BE_UNCONDITIONAL_NESTED_CONDITIONS_ARE_FORBIDDEN,
    );
  if (
    parent.type === "single_select" &&
    !parent.options.some((opt) => opt.id === equalsOptionId)
  )
    add(
      "MISSING_PARENT_OPTION",
      APP_MESSAGES.REFERENCED_OPTION_NO_LONGER_EXISTS_IN_PARENT_QUESTION,
    );
  return errors;
}
