import { Question } from "@/features/forms/domain/types";
import { PatientAnswers, CanonicalAnswer } from "./types";
import { pruneHiddenAnswers, getVisibleQuestions } from "./visibility";

export interface AnswerValidationError {
  questionId: string;
  issue: string;
  code: string;
}

/**
 * Validates progress saves (in-progress autosave).
 * Missing required answers are permitted while intake is incomplete,
 * but any provided answer must adhere to canonical types and valid choice IDs.
 * Hidden answers are automatically pruned.
 */
export function validateSessionProgress(
  incomingAnswers: PatientAnswers,
  questions: Question[]
): {
  valid: boolean;
  errors: AnswerValidationError[];
  sanitizedAnswers: PatientAnswers;
} {
  const sanitizedAnswers = pruneHiddenAnswers(incomingAnswers, questions);
  const errors: AnswerValidationError[] = [];
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  for (const [qId, value] of Object.entries(sanitizedAnswers)) {
    const q = questionMap.get(qId);
    if (!q) {
      errors.push({
        questionId: qId,
        issue: `Unknown question ID "${qId}"`,
        code: "UNKNOWN_QUESTION",
      });
      continue;
    }

    const fieldErrors = validateValueTypeAndBounds(q, value);
    errors.push(...fieldErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedAnswers,
  };
}

/**
 * Strictly validates the final intake submission against the pinned version snapshot.
 *
 * Requirements:
 * - Hidden answers pruned and deleted on server.
 * - Every VISIBLE required field must be present and valid.
 * - Required short/long text must contain non-whitespace characters (trimmed).
 * - Required checkbox must be `true`.
 * - Numbers must be finite, non-NaN, within bounds, and integer if integerOnly.
 * - Single-select must match an authoritative option ID.
 * - Multi-select must have valid option IDs without duplicates, and >=1 choice if required.
 * - Unknown question IDs are strictly rejected.
 */
export function validateSessionSubmission(
  incomingAnswers: PatientAnswers,
  questions: Question[]
): {
  valid: boolean;
  errors: AnswerValidationError[];
  sanitizedAnswers: PatientAnswers;
} {
  const sanitizedAnswers = pruneHiddenAnswers(incomingAnswers, questions);
  const errors: AnswerValidationError[] = [];
  const visibleQuestions = getVisibleQuestions(questions, sanitizedAnswers);
  const visibleQuestionIds = new Set(visibleQuestions.map((q) => q.id));

  // Check for unknown or leaked question answers
  for (const qId of Object.keys(sanitizedAnswers)) {
    if (!visibleQuestionIds.has(qId)) {
      errors.push({
        questionId: qId,
        issue: `Answer submitted for invisible or unknown question "${qId}"`,
        code: "UNEXPECTED_ANSWER",
      });
    }
  }

  // Validate each visible question
  for (const q of visibleQuestions) {
    const value = sanitizedAnswers[q.id];

    if (q.required) {
      if (value === undefined || value === null) {
        errors.push({
          questionId: q.id,
          issue: `Required question "${q.label}" was not answered`,
          code: "REQUIRED_FIELD_MISSING",
        });
        continue;
      }

      if (q.type === "short_text" || q.type === "long_text") {
        if (typeof value !== "string" || value.trim().length === 0) {
          errors.push({
            questionId: q.id,
            issue: `Required text field "${q.label}" cannot be blank`,
            code: "REQUIRED_TEXT_BLANK",
          });
          continue;
        }
      }

      if (q.type === "checkbox") {
        if (value !== true) {
          errors.push({
            questionId: q.id,
            issue: `Required checkbox "${q.label}" must be checked`,
            code: "REQUIRED_CHECKBOX_UNCHECKED",
          });
          continue;
        }
      }

      if (q.type === "multi_select") {
        if (!Array.isArray(value) || value.length === 0) {
          errors.push({
            questionId: q.id,
            issue: `Required multi-select "${q.label}" must have at least one choice selected`,
            code: "REQUIRED_MULTISELECT_EMPTY",
          });
          continue;
        }
      }
    }

    // Validate type and bounds if answer is present
    if (value !== undefined && value !== null) {
      const fieldErrors = validateValueTypeAndBounds(q, value);
      errors.push(...fieldErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedAnswers,
  };
}

function validateValueTypeAndBounds(
  q: Question,
  value: CanonicalAnswer
): AnswerValidationError[] {
  const errors: AnswerValidationError[] = [];

  switch (q.type) {
    case "short_text":
    case "long_text": {
      if (typeof value !== "string") {
        errors.push({
          questionId: q.id,
          issue: "Value must be a string",
          code: "INVALID_TYPE",
        });
        return errors;
      }
      const trimmed = value.trim();
      if (q.validation) {
        const { minLength, maxLength } = q.validation;
        if (minLength !== undefined && trimmed.length > 0 && trimmed.length < minLength) {
          errors.push({
            questionId: q.id,
            issue: `Text must be at least ${minLength} characters`,
            code: "MIN_LENGTH_VIOLATION",
          });
        }
        if (maxLength !== undefined && trimmed.length > maxLength) {
          errors.push({
            questionId: q.id,
            issue: `Text cannot exceed ${maxLength} characters`,
            code: "MAX_LENGTH_VIOLATION",
          });
        }
      }
      break;
    }

    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value) || Number.isNaN(value)) {
        errors.push({
          questionId: q.id,
          issue: "Value must be a valid, finite number",
          code: "INVALID_NUMBER",
        });
        return errors;
      }
      if (q.validation) {
        const { min, max, integerOnly } = q.validation;
        if (integerOnly && !Number.isInteger(value)) {
          errors.push({
            questionId: q.id,
            issue: "Value must be a whole integer",
            code: "INTEGER_ONLY_VIOLATION",
          });
        }
        if (min !== undefined && value < min) {
          errors.push({
            questionId: q.id,
            issue: `Number must be greater than or equal to ${min}`,
            code: "MIN_VALUE_VIOLATION",
          });
        }
        if (max !== undefined && value > max) {
          errors.push({
            questionId: q.id,
            issue: `Number cannot exceed ${max}`,
            code: "MAX_VALUE_VIOLATION",
          });
        }
      }
      break;
    }

    case "single_select": {
      if (typeof value !== "string") {
        errors.push({
          questionId: q.id,
          issue: "Single-select answer must be an option ID string",
          code: "INVALID_TYPE",
        });
        return errors;
      }
      const validOptionIds = new Set(q.options.map((o) => o.id));
      if (!validOptionIds.has(value)) {
        errors.push({
          questionId: q.id,
          issue: `Option ID "${value}" is not a recognized choice for this question`,
          code: "UNKNOWN_OPTION_ID",
        });
      }
      break;
    }

    case "multi_select": {
      if (!Array.isArray(value)) {
        errors.push({
          questionId: q.id,
          issue: "Multi-select answer must be an array of option IDs",
          code: "INVALID_TYPE",
        });
        return errors;
      }
      const validOptionIds = new Set(q.options.map((o) => o.id));
      const seen = new Set<string>();
      for (const optId of value) {
        if (typeof optId !== "string" || !validOptionIds.has(optId)) {
          errors.push({
            questionId: q.id,
            issue: `Option ID "${optId}" is not a recognized choice for this question`,
            code: "UNKNOWN_OPTION_ID",
          });
        }
        if (seen.has(optId)) {
          errors.push({
            questionId: q.id,
            issue: `Duplicate option selection "${optId}" is not permitted`,
            code: "DUPLICATE_SELECTION",
          });
        }
        seen.add(optId);
      }
      break;
    }

    case "checkbox": {
      if (typeof value !== "boolean") {
        errors.push({
          questionId: q.id,
          issue: "Checkbox answer must be a boolean",
          code: "INVALID_TYPE",
        });
      }
      break;
    }
  }

  return errors;
}
