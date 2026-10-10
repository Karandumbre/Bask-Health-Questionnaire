import {
  FormDefinition,
  FormDefinitionSchema,
  Question,
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
      issue: "Form title cannot be blank",
      code: "EMPTY_TITLE",
    });
  }

  if (!definition.questions || definition.questions.length === 0) {
    errors.push({
      field: "questions",
      issue: "Form must contain at least one question before publishing",
      code: "NO_QUESTIONS",
    });
    return { valid: false, errors };
  }

  // Question ID uniqueness & index map
  const questionIndexMap = new Map<string, number>();
  const questionMap = new Map<string, Question>();

  for (let i = 0; i < definition.questions.length; i++) {
    const q = definition.questions[i];
    if (!q) continue;

    if (questionIndexMap.has(q.id)) {
      errors.push({
        questionId: q.id,
        issue: `Duplicate question ID detected: "${q.id}"`,
        code: "DUPLICATE_QUESTION_ID",
      });
    } else {
      questionIndexMap.set(q.id, i);
      questionMap.set(q.id, q);
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
              issue: `Minimum length (${minLength}) cannot be greater than maximum length (${maxLength})`,
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
              issue: "Minimum value must be a finite number",
              code: "INVALID_NUMBER_MIN",
            });
          }
          if (max !== undefined && !Number.isFinite(max)) {
            errors.push({
              questionId: q.id,
              field: "max",
              issue: "Maximum value must be a finite number",
              code: "INVALID_NUMBER_MAX",
            });
          }
          if (min !== undefined && max !== undefined && min > max) {
            errors.push({
              questionId: q.id,
              field: "validation",
              issue: `Minimum value (${min}) cannot be greater than maximum value (${max})`,
              code: "INVALID_NUMBER_RANGE",
            });
          }
          if (integerOnly) {
            if (min !== undefined && !Number.isInteger(min)) {
              errors.push({
                questionId: q.id,
                field: "min",
                issue:
                  "Minimum bound must be an integer when integer-only is enabled",
                code: "NON_INTEGER_BOUND",
              });
            }
            if (max !== undefined && !Number.isInteger(max)) {
              errors.push({
                questionId: q.id,
                field: "max",
                issue:
                  "Maximum bound must be an integer when integer-only is enabled",
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

    // Visibility Condition Validation
    if (q.visibility) {
      const { parentQuestionId, equalsOptionId } = q.visibility;
      const parentIndex = questionIndexMap.get(parentQuestionId);

      if (parentIndex === undefined) {
        errors.push({
          questionId: q.id,
          field: "visibility",
          issue: `Condition references non-existent parent question "${parentQuestionId}"`,
          code: "MISSING_PARENT_QUESTION",
        });
      } else if (parentIndex >= i) {
        errors.push({
          questionId: q.id,
          field: "visibility",
          issue: `Condition references parent question "${parentQuestionId}" which appears at or after this question`,
          code: "FORWARD_OR_SELF_DEPENDENCY",
        });
      } else {
        const parent = questionMap.get(parentQuestionId);
        if (!parent) {
          errors.push({
            questionId: q.id,
            field: "visibility",
            issue: `Parent question "${parentQuestionId}" not found`,
            code: "MISSING_PARENT_QUESTION",
          });
        } else {
          // Parent MUST be single_select
          if (parent.type !== "single_select") {
            errors.push({
              questionId: q.id,
              field: "visibility",
              issue: `Condition parent question must be single_select, but is "${parent.type}"`,
              code: "INVALID_PARENT_TYPE",
            });
          }

          // Parent MUST be required
          if (!parent.required) {
            errors.push({
              questionId: q.id,
              field: "visibility",
              issue: "Condition parent question must be required",
              code: "PARENT_NOT_REQUIRED",
            });
          }

          // Parent MUST be unconditional (no nested conditions)
          if (parent.visibility !== null) {
            errors.push({
              questionId: q.id,
              field: "visibility",
              issue:
                "Condition parent question must be unconditional (nested conditions are not allowed)",
              code: "NESTED_CONDITION_FORBIDDEN",
            });
          }

          // equalsOptionId MUST exist in parent options
          if (parent.type === "single_select") {
            const hasOption = parent.options.some(
              (opt) => opt.id === equalsOptionId,
            );
            if (!hasOption) {
              errors.push({
                questionId: q.id,
                field: "visibility",
                issue: `Condition references non-existent option ID "${equalsOptionId}" on parent question`,
                code: "MISSING_PARENT_OPTION",
              });
            }
          }
        }
      }
    }
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
      issue: `Select question must have at least 2 distinct choices (found ${q.options ? q.options.length : 0})`,
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
          issue: `Duplicate option label "${opt.label}" detected in question`,
          code: "DUPLICATE_OPTION_LABEL",
        });
      }
      seenNormalizedLabels.add(normalizedLabel);
    }

    if (seenOptionIds.has(opt.id)) {
      errors.push({
        questionId: q.id,
        field: `options[${j}].id`,
        issue: `Duplicate option ID "${opt.id}" detected in question`,
        code: "DUPLICATE_OPTION_ID",
      });
    }
    seenOptionIds.add(opt.id);
  }
}
