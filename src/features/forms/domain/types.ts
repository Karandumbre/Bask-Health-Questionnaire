import { APP_MESSAGES } from "@/lib/constants/messages";
import { z } from "zod";

/**
 * Stable Option Definition for single-select and multi-select fields.
 */
const OptionSchema = z.object({
  id: z.string().min(1, APP_MESSAGES.OPTION_ID_MUST_NOT_BE_EMPTY),
  label: z.string(),
});
export type Option = z.infer<typeof OptionSchema>;

/**
 * Visibility Condition:
 * Single condition allowed: points to an earlier, required, unconditional single_select question.
 */
const VisibilityConditionSchema = z.object({
  parentQuestionId: z.string(),
  equalsOptionId: z.string(),
});
export type VisibilityCondition = z.infer<typeof VisibilityConditionSchema>;

/**
 * Validation constraints for text fields.
 */
const TextValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
});
export type TextValidation = z.infer<typeof TextValidationSchema>;

/**
 * Validation constraints for numeric fields.
 */
const NumberValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  integerOnly: z.boolean().optional(),
});
export type NumberValidation = z.infer<typeof NumberValidationSchema>;

/**
 * Base Question properties shared across all types.
 */
const BaseQuestionSchema = z.object({
  id: z.string().min(1, APP_MESSAGES.QUESTION_ID_MUST_NOT_BE_EMPTY),
  label: z.string().default(""),
  description: z.string().optional(),
  required: z.boolean().default(false),
  visibility: VisibilityConditionSchema.nullable().default(null),
});

/**
 * Specific Question schemas forming a strict discriminated union on `type`.
 */
const ShortTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("short_text"),
  placeholder: z.string().optional(),
  validation: TextValidationSchema.optional(),
});
export type ShortTextQuestion = z.infer<typeof ShortTextQuestionSchema>;

const LongTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("long_text"),
  placeholder: z.string().optional(),
  validation: TextValidationSchema.optional(),
});
export type LongTextQuestion = z.infer<typeof LongTextQuestionSchema>;

const NumberQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("number"),
  placeholder: z.string().optional(),
  validation: NumberValidationSchema.optional(),
});
export type NumberQuestion = z.infer<typeof NumberQuestionSchema>;

const SingleSelectQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("single_select"),
  options: z.array(OptionSchema).default([]),
});
export type SingleSelectQuestion = z.infer<typeof SingleSelectQuestionSchema>;

const MultiSelectQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("multi_select"),
  options: z.array(OptionSchema).default([]),
});
export type MultiSelectQuestion = z.infer<typeof MultiSelectQuestionSchema>;

const CheckboxQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("checkbox"),
});
export type CheckboxQuestion = z.infer<typeof CheckboxQuestionSchema>;

/**
 * Discriminated Union of all Question types.
 */
export const QuestionSchema = z.discriminatedUnion("type", [
  ShortTextQuestionSchema,
  LongTextQuestionSchema,
  NumberQuestionSchema,
  SingleSelectQuestionSchema,
  MultiSelectQuestionSchema,
  CheckboxQuestionSchema,
]);
export type Question = z.infer<typeof QuestionSchema>;
export type FieldType = Question["type"];

/**
 * Form Definition: Canonical schema version 1.
 */
export const FormDefinitionSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  title: z.string().default(APP_MESSAGES.UNTITLED_FORM),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).default([]),
});
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;

export {
  ThemeDefinitionSchema,
  type ThemeDefinition,
} from "@/features/themes/domain/theme-tokens";
