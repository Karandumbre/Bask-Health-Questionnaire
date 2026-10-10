import { z } from "zod";

/**
 * Canonical answer value types:
 * - short_text / long_text: string
 * - number: number (finite)
 * - single_select: string (optionId)
 * - multi_select: string[] (array of optionIds)
 * - checkbox: boolean
 */
const CanonicalAnswerSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export type CanonicalAnswer = z.infer<typeof CanonicalAnswerSchema>;

export const PatientAnswersSchema = z.record(z.string(), CanonicalAnswerSchema);
export type PatientAnswers = z.infer<typeof PatientAnswersSchema>;
