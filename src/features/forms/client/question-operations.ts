import type { FieldType, Question } from "../domain/types";

export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
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
        label: `Question ${index + 1}`,
        placeholder: "Enter text...",
      };
    case "long_text":
      return {
        ...base,
        type: "long_text",
        label: `Question ${index + 1}`,
        placeholder: "Enter detailed explanation...",
      };
    case "number":
      return {
        ...base,
        type: "number",
        label: `Numeric Question ${index + 1}`,
        validation: { integerOnly: true },
      };
    case "single_select":
      return {
        ...base,
        type: "single_select",
        label: `Single-choice Question ${index + 1}`,
        options: [
          { id: generateId("opt"), label: "Option 1" },
          { id: generateId("opt"), label: "Option 2" },
        ],
      };
    case "multi_select":
      return {
        ...base,
        type: "multi_select",
        label: `Multi-select Question ${index + 1}`,
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
        label: `I acknowledge and consent to the intake terms`,
      };
  }
}

export function cloneQuestionWithNewId(
  source: Question,
  newId: string,
): Question {
  const newLabel = `${source.label} (Copy)`;
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
