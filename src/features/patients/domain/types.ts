import { z } from "zod";

/**
 * Canonical answer value types:
 * - short_text / long_text: string
 * - number: number (finite)
 * - single_select: string (optionId)
 * - multi_select: string[] (array of optionIds)
 * - checkbox: boolean
 */
export const CanonicalAnswerSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);
export type CanonicalAnswer = z.infer<typeof CanonicalAnswerSchema>;

/**
 * Keyed by stable questionId.
 */
export const PatientAnswersSchema = z.record(z.string(), CanonicalAnswerSchema);
export type PatientAnswers = z.infer<typeof PatientAnswersSchema>;

/**
 * Patient progress save request payload.
 */
export const ProgressSavePayloadSchema = z.object({
  expectedSessionRevision: z.number().int().min(0),
  answers: PatientAnswersSchema,
});
export type ProgressSavePayload = z.infer<typeof ProgressSavePayloadSchema>;

/**
 * Patient final submission payload.
 */
export const SubmissionPayloadSchema = z.object({
  answers: PatientAnswersSchema,
});
export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;

/**
 * Session verification payload for resume.
 */
export const ResumeSessionPayloadSchema = z.object({
  sessionReference: z.string().min(1, "Session reference is required"),
  recoveryCode: z.string().min(1, "Recovery code is required"),
});
export type ResumeSessionPayload = z.infer<typeof ResumeSessionPayloadSchema>;

