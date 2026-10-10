import { z } from "zod";

/**
 * Stable Option Definition for single-select and multi-select fields.
 */
export const OptionSchema = z.object({
  id: z.string().min(1, "Option ID must not be empty"),
  label: z.string().min(1, "Option label must not be empty"),
});
export type Option = z.infer<typeof OptionSchema>;

/**
 * Visibility Condition:
 * Single condition allowed: points to an earlier, required, unconditional single_select question.
 */
export const VisibilityConditionSchema = z.object({
  parentQuestionId: z.string().min(1, "Parent question ID is required"),
  equalsOptionId: z.string().min(1, "Target option ID is required"),
});
export type VisibilityCondition = z.infer<typeof VisibilityConditionSchema>;

/**
 * Validation constraints for text fields.
 */
export const TextValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
});
export type TextValidation = z.infer<typeof TextValidationSchema>;

/**
 * Validation constraints for numeric fields.
 */
export const NumberValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  integerOnly: z.boolean().optional(),
});
export type NumberValidation = z.infer<typeof NumberValidationSchema>;

/**
 * Base Question properties shared across all types.
 */
const BaseQuestionSchema = z.object({
  id: z.string().min(1, "Question ID must not be empty"),
  label: z.string().default(""),
  description: z.string().optional(),
  required: z.boolean().default(false),
  visibility: VisibilityConditionSchema.nullable().default(null),
});

/**
 * Specific Question schemas forming a strict discriminated union on `type`.
 */
export const ShortTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("short_text"),
  placeholder: z.string().optional(),
  validation: TextValidationSchema.optional(),
});
export type ShortTextQuestion = z.infer<typeof ShortTextQuestionSchema>;

export const LongTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("long_text"),
  placeholder: z.string().optional(),
  validation: TextValidationSchema.optional(),
});
export type LongTextQuestion = z.infer<typeof LongTextQuestionSchema>;

export const NumberQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("number"),
  placeholder: z.string().optional(),
  validation: NumberValidationSchema.optional(),
});
export type NumberQuestion = z.infer<typeof NumberQuestionSchema>;

export const SingleSelectQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("single_select"),
  options: z.array(OptionSchema).default([]),
});
export type SingleSelectQuestion = z.infer<typeof SingleSelectQuestionSchema>;

export const MultiSelectQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("multi_select"),
  options: z.array(OptionSchema).default([]),
});
export type MultiSelectQuestion = z.infer<typeof MultiSelectQuestionSchema>;

export const CheckboxQuestionSchema = BaseQuestionSchema.extend({
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
  title: z.string().default("Untitled Form"),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).default([]),
});
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;

/**
 * Theme Token Palette for light and dark modes.
 */
export const ThemeModeTokensSchema = z.object({
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  textMuted: z.string().optional(),
  border: z.string().optional(),
  primary: z.string(),
  primaryForeground: z.string(),
  focusRing: z.string().optional(),
  error: z.string().optional(),
});
export type ThemeModeTokens = z.infer<typeof ThemeModeTokensSchema>;

export const ThemeDefinitionSchema = z.object({
  presetName: z.string().default("Ocean"),
  isCustomShuffle: z.boolean().default(false),
  light: ThemeModeTokensSchema,
  dark: ThemeModeTokensSchema,
});
export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;
