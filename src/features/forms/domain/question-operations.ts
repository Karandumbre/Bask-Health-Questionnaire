import { QUESTION_DEFAULTS } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";
import type { FieldType, Question } from "./types";

export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultQuestion(
  type: FieldType,
  index: number,
): Question {
  const base = {
    id: generateId("q"),
    required: false,
    visibility: null,
  };

  switch (type) {
    case "short_text":
      return {
        ...base,
        type: "short_text",
        label: QUESTION_DEFAULTS.label(index),
        placeholder: APP_MESSAGES.ENTER_TEXT,
      };
    case "long_text":
      return {
        ...base,
        type: "long_text",
        label: QUESTION_DEFAULTS.label(index),
        placeholder: APP_MESSAGES.ENTER_DETAILED_EXPLANATION,
      };
    case "number":
      return {
        ...base,
        type: "number",
        label: APP_MESSAGES.NUMERIC_QUESTION_FORMATTED(index + 1),
        validation: { integerOnly: true },
      };
    case "single_select":
      return {
        ...base,
        type: "single_select",
        label: APP_MESSAGES.SINGLE_CHOICE_QUESTION_FORMATTED(index + 1),
        options: [
          { id: generateId("opt"), label: "Option 1" },
          { id: generateId("opt"), label: "Option 2" },
        ],
      };
    case "multi_select":
      return {
        ...base,
        type: "multi_select",
        label: APP_MESSAGES.MULTI_SELECT_QUESTION_FORMATTED(index + 1),
        options: [
          { id: generateId("opt"), label: "Option 1" },
          { id: generateId("opt"), label: "Option 2" },
          { id: generateId("opt"), label: "Option 3" },
        ],
      };
    case "checkbox":
      return {
        ...base,
        type: "checkbox",
        label: APP_MESSAGES.I_ACKNOWLEDGE_AND_CONSENT_TO_THE_INTAKE_TERMS,
      };
  }
}

export function cloneQuestionWithNewId(
  source: Question,
  newId: string,
): Question {
  const newLabel = QUESTION_DEFAULTS.copyLabel(source.label);
  const vis = source.visibility ? { ...source.visibility } : null;

  switch (source.type) {
    case "single_select":
    case "multi_select":
      return {
        ...source,
        id: newId,
        label: newLabel,
        options: source.options.map((opt) => ({
          ...opt,
          id: generateId("opt"),
        })),
        visibility: vis,
      };
    case "short_text":
    case "long_text":
    case "number":
    case "checkbox":
      return {
        ...source,
        id: newId,
        label: newLabel,
        visibility: vis,
      };
  }
}
