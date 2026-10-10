import { API_ROUTES } from "@/lib/constants/application";
import { z } from "zod";
import { apiRequest, successSchema } from "@/lib/http/api-client";
import { FormDefinitionSchema, ThemeDefinitionSchema } from "../domain/types";

export const SubmissionListItemSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  sessionReference: z.string(),
  formName: z.string().optional(),
  publishedVersionId: z.string(),
  versionNumber: z.number().int().positive(),
  answerSnapshot: z.record(z.string(), z.unknown()),
  status: z.string().optional().default("completed"),
  submittedAt: z.union([z.string(), z.date()]).transform((d) =>
    typeof d === "string" ? d : d.toISOString(),
  ),
});

export type SubmissionListItem = z.infer<typeof SubmissionListItemSchema>;

export const SubmissionDetailSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  sessionReference: z.string(),
  formName: z.string().optional(),
  publishedVersionId: z.string(),
  versionNumber: z.number().int().positive(),
  definitionSnapshot: FormDefinitionSchema,
  themeSnapshot: ThemeDefinitionSchema,
  answerSnapshot: z.record(z.string(), z.unknown()),
  status: z.string().optional().default("completed"),
  submittedAt: z.union([z.string(), z.date()]).transform((d) =>
    typeof d === "string" ? d : d.toISOString(),
  ),
});

export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

const listResponseSchema = successSchema.extend({
  submissions: z.array(SubmissionListItemSchema),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

const detailResponseSchema = successSchema.extend({
  submission: SubmissionDetailSchema,
});

export async function fetchFormSubmissions(
  formId: string,
  options?: { limit?: number; offset?: number; signal?: AbortSignal },
) {
  const url = new URL(
    API_ROUTES.formResponses(formId),
    "http://localhost:3000",
  );
  if (options?.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }
  if (options?.offset !== undefined) {
    url.searchParams.set("offset", String(options.offset));
  }

  const endpoint = `${url.pathname}${url.search}`;
  const response = await apiRequest(endpoint, listResponseSchema, {
    method: "GET",
    signal: options?.signal,
  });

  return response.submissions;
}

export async function fetchSubmissionDetail(
  formId: string,
  submissionId: string,
  signal?: AbortSignal,
) {
  const endpoint = `${API_ROUTES.formResponses(formId)}?submissionId=${encodeURIComponent(submissionId)}`;
  const response = await apiRequest(endpoint, detailResponseSchema, {
    method: "GET",
    signal,
  });

  return response.submission;
}

