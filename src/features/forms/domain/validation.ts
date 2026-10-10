import { APP_MESSAGES } from "@/lib/constants/messages";
import { validateQuestionCondition } from "./conditions";
import {
  FormDefinition,
  FormDefinitionSchema,
  SingleSelectQuestion,
  MultiSelectQuestion,
} from "./types";

export interface FormValidationError {
  questionId?: string;
  field?: string;
  issue: string;
  code: string;
}

/**
 * Validates a draft definition permissively.
 * Incomplete drafts are allowed during authoring so progress is never lost.
 */
export function validateFormForDraft(input: unknown): {
  valid: boolean;
  data?: FormDefinition;
  error?: string;
} {
  const result = FormDefinitionSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false,
      error: result.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; "),
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Strictly validates a form definition before publication.
 * Enforces all clinical integrity rules:
 * - Title is non-blank
 * - At least 1 question
 * - Question labels non-blank
 * - Stable unique question IDs
 * - Choice sets >= 2 distinct choices with non-blank labels and unique IDs
 * - Conditions reference earlier, required, unconditional single-select questions and valid options
 * - Number ranges and text limits are coherent
 */
export function validateFormForPublish(definition: FormDefinition): {
  valid: boolean;
  errors: FormValidationError[];
} {
  const errors: FormValidationError[] = [];

  // Form-level checks
  if (!definition.title || definition.title.trim().length === 0) {
    errors.push({
      field: "title",
      issue: APP_MESSAGES.FORM_TITLE_CANNOT_BE_BLANK,
      code: "EMPTY_TITLE",
    });
  }

  if (!definition.questions || definition.questions.length === 0) {
    errors.push({
      field: "questions",
      issue: APP_MESSAGES.FORM_MUST_CONTAIN_AT_LEAST_ONE_QUESTION_BEFORE,
      code: "NO_QUESTIONS",
    });
    return { valid: false, errors };
  }

  // Question ID uniqueness & index map
  const questionIndexMap = new Map<string, number>();

  for (let i = 0; i < definition.questions.length; i++) {
    const q = definition.questions[i];
    if (!q) continue;

    if (questionIndexMap.has(q.id)) {
      errors.push({
        questionId: q.id,
        issue: APP_MESSAGES.DUPLICATE_QUESTION_ID_DETECTED_FORMATTED(q.id),
        code: "DUPLICATE_QUESTION_ID",
      });
    } else {
      questionIndexMap.set(q.id, i);
    }
  }

  // Validate each question
  for (let i = 0; i < definition.questions.length; i++) {
    const q = definition.questions[i];
    if (!q) continue;

    // Label check
    if (!q.label || q.label.trim().length === 0) {
      errors.push({
        questionId: q.id,
        field: "label",
        issue: `Question ${i + 1} must have a non-blank label`,
        code: "EMPTY_QUESTION_LABEL",
      });
    }

    // Type-specific checks
    switch (q.type) {
      case "short_text":
      case "long_text": {
        if (q.validation) {
          const { minLength, maxLength } = q.validation;
          if (
            minLength !== undefined &&
            maxLength !== undefined &&
            minLength > maxLength
          ) {
            errors.push({
              questionId: q.id,
              field: "validation",
              issue: APP_MESSAGES.MINIMUM_LENGTH_FORMATTED(
                minLength,
                maxLength,
              ),
              code: "INVALID_LENGTH_RANGE",
            });
          }
        }
        break;
      }

      case "number": {
        if (q.validation) {
          const { min, max, integerOnly } = q.validation;
          if (min !== undefined && !Number.isFinite(min)) {
            errors.push({
              questionId: q.id,
              field: "min",
              issue: APP_MESSAGES.MINIMUM_VALUE_MUST_BE_A_FINITE_NUMBER,
              code: "INVALID_NUMBER_MIN",
            });
          }
          if (max !== undefined && !Number.isFinite(max)) {
            errors.push({
              questionId: q.id,
              field: "max",
              issue: APP_MESSAGES.MAXIMUM_VALUE_MUST_BE_A_FINITE_NUMBER,
              code: "INVALID_NUMBER_MAX",
            });
          }
          if (min !== undefined && max !== undefined && min > max) {
            errors.push({
              questionId: q.id,
              field: "validation",
              issue: APP_MESSAGES.MINIMUM_VALUE_FORMATTED(min, max),
              code: "INVALID_NUMBER_RANGE",
            });
          }
          if (integerOnly) {
            if (min !== undefined && !Number.isInteger(min)) {
              errors.push({
                questionId: q.id,
                field: "min",
                issue:
                  APP_MESSAGES.MINIMUM_BOUND_MUST_BE_AN_INTEGER_WHEN_INTEGER,
                code: "NON_INTEGER_BOUND",
              });
            }
            if (max !== undefined && !Number.isInteger(max)) {
              errors.push({
                questionId: q.id,
                field: "max",
                issue:
                  APP_MESSAGES.MAXIMUM_BOUND_MUST_BE_AN_INTEGER_WHEN_INTEGER,
                code: "NON_INTEGER_BOUND",
              });
            }
          }
        }
        break;
      }

      case "single_select":
      case "multi_select": {
        validateChoiceOptions(q, errors);
        break;
      }

      case "checkbox": {
        // No specific additional field configuration required
        break;
      }
    }

    errors.push(...validateQuestionCondition(definition.questions, q));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateChoiceOptions(
  q: SingleSelectQuestion | MultiSelectQuestion,
  errors: FormValidationError[],
): void {
  if (!q.options || q.options.length < 2) {
    errors.push({
      questionId: q.id,
      field: "options",
      issue: APP_MESSAGES.SELECT_QUESTION_MUST_HAVE_AT_LEAST_2_DISTINCT(
        q.options ? q.options.length : 0,
      ),
      code: "INSUFFICIENT_OPTIONS",
    });
    return;
  }

  const seenOptionIds = new Set<string>();
  const seenNormalizedLabels = new Set<string>();

  for (let j = 0; j < q.options.length; j++) {
    const opt = q.options[j];
    if (!opt) continue;

    if (!opt.label || opt.label.trim().length === 0) {
      errors.push({
        questionId: q.id,
        field: `options[${j}].label`,
        issue: `Option ${j + 1} label cannot be blank`,
        code: "EMPTY_OPTION_LABEL",
      });
    } else {
      const normalizedLabel = opt.label.trim().toLowerCase();
      if (seenNormalizedLabels.has(normalizedLabel)) {
        errors.push({
          questionId: q.id,
          field: `options[${j}].label`,
          issue: APP_MESSAGES.DUPLICATE_OPTION_LABEL_FORMATTED(opt.label),
          code: "DUPLICATE_OPTION_LABEL",
        });
      }
      seenNormalizedLabels.add(normalizedLabel);
    }

    if (seenOptionIds.has(opt.id)) {
      errors.push({
        questionId: q.id,
        field: `options[${j}].id`,
        issue: APP_MESSAGES.DUPLICATE_OPTION_ID_FORMATTED(opt.id),
        code: "DUPLICATE_OPTION_ID",
      });
    }
    seenOptionIds.add(opt.id);
  }
}
