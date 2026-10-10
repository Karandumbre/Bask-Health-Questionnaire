import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/http/api-client";
import {
  FormDefinitionSchema,
  ThemeDefinitionSchema,
} from "@/features/forms/domain/types";
import { PatientAnswersSchema, type PatientAnswers } from "../domain/types";

const patientFormResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    publicSlug: z.string(),
    versionNumber: z.number().int(),
    publishedAt: z.string().or(z.date()),
    definition: FormDefinitionSchema,
    theme: ThemeDefinitionSchema,
  }),
});

const BasePatientSessionSchema = z.object({
  sessionId: z.string(),
  sessionReference: z.string(),
  publicSlug: z.string(),
  versionNumber: z.number(),
  definition: FormDefinitionSchema,
  theme: ThemeDefinitionSchema,
  currentAnswers: PatientAnswersSchema,
  sessionRevision: z.number(),
});
export type BasePatientSession = z.infer<typeof BasePatientSessionSchema>;

const activeSessionResponseSchema = z.object({
  success: z.literal(true),
  data: z.discriminatedUnion("active", [
    z.object({
      active: z.literal(false),
      sessionEnded: z.boolean().optional(),
    }),
    BasePatientSessionSchema.extend({
      active: z.literal(true),
      status: z.enum(["in_progress", "completed", "expired"]),
      submission: z
        .object({
          submissionId: z.string(),
          submittedAt: z.string().or(z.date()),
        })
        .optional(),
    }),
  ]),
});

export type ActivePatientSession = Extract<
  z.infer<typeof activeSessionResponseSchema>["data"],
  { active: true }
>;

const startSessionResponseSchema = z.object({
  success: z.literal(true),
  data: BasePatientSessionSchema.extend({
    recoveryCode: z.string(),
  }),
});

const saveProgressResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    sessionRevision: z.number(),
    sanitizedAnswers: PatientAnswersSchema,
  }),
});

const resumeSessionResponseSchema = z.object({
  success: z.literal(true),
  data: BasePatientSessionSchema.extend({
    newRecoveryCode: z.string(),
  }),
});
export type ResumeSessionData = z.infer<
  typeof resumeSessionResponseSchema
>["data"];

const submitResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    submissionId: z.string(),
    sessionId: z.string().optional(),
    submittedAt: z.string().or(z.date()),
    status: z.literal("completed"),
    isIdempotentReplay: z.boolean(),
  }),
});

/**
 * Fetches the published intake form by public slug.
 */
export function fetchPublishedForm(slug: string, signal?: AbortSignal) {
  return apiRequest(
    `/api/patient/forms/${encodeURIComponent(slug)}`,
    patientFormResponseSchema,
    {
      method: "GET",
      signal,
    },
  );
}

/**
 * Inspects whether the browser has an active session capability on this published form.
 */
export function getActiveSession(slug: string, signal?: AbortSignal) {
  return apiRequest(
    `/api/patient/forms/${encodeURIComponent(slug)}/session`,
    activeSessionResponseSchema,
    {
      method: "GET",
      signal,
    },
  );
}

/**
 * Initializes a new patient intake session, issuing a namespaced HttpOnly capability cookie.
 */
export function startPatientSession(slug: string, signal?: AbortSignal) {
  return apiRequest(
    `/api/patient/forms/${encodeURIComponent(slug)}/session`,
    startSessionResponseSchema,
    {
      method: "POST",
      signal,
    },
  );
}

/**
 * Saves in-progress answers with revision protection.
 */
export function savePatientProgress(
  slug: string,
  expectedSessionRevision: number,
  answers: PatientAnswers,
  signal?: AbortSignal,
) {
  return apiRequest(
    "/api/patient/session/progress",
    saveProgressResponseSchema,
    {
      method: "PUT",
      json: {
        publicSlug: slug,
        expectedSessionRevision,
        answers,
      },
      signal,
    },
  );
}

/**
 * Resumes an existing session across devices via recovery code redemption.
 */
export function resumePatientSession(
  sessionReference: string,
  recoveryCode: string,
  signal?: AbortSignal,
) {
  return apiRequest(
    "/api/patient/session/resume",
    resumeSessionResponseSchema,
    {
      method: "POST",
      json: {
        sessionReference,
        recoveryCode,
      },
      signal,
    },
  );
}

/**
 * Submits the completed patient intake session for final transactional persistence.
 */
export function submitPatientSession(
  slug: string,
  answers: PatientAnswers,
  signal?: AbortSignal,
) {
  return apiRequest("/api/patient/session/submit", submitResponseSchema, {
    method: "POST",
    json: {
      publicSlug: slug,
      answers,
    },
    signal,
  });
}

/** Session authorization failures end access; server/network failures remain retryable. */
export function isPatientSessionEnded(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "SESSION_EXPIRED" || error.code === "SESSION_UNAUTHORIZED")
  );
}
