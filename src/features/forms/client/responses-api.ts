import { API_ROUTES } from "@/lib/constants/application";
import { z } from "zod";
import { apiRequest, successSchema } from "@/lib/http/api-client";
import { FormDefinitionSchema, ThemeDefinitionSchema } from "../domain/types";
import { PatientAnswersSchema } from "@/features/patients/domain/types";

export const BaseSubmissionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  sessionReference: z.string(),
  formName: z.string().optional(),
  publishedVersionId: z.string(),
  versionNumber: z.number().int().positive(),
  answerSnapshot: PatientAnswersSchema,
  status: z.string().optional().default("completed"),
  submittedAt: z
    .union([z.string(), z.date()])
    .transform((d) => (typeof d === "string" ? d : d.toISOString())),
});

export const SubmissionListItemSchema = BaseSubmissionSchema;
export type SubmissionListItem = z.infer<typeof SubmissionListItemSchema>;

export const SubmissionDetailSchema = BaseSubmissionSchema.extend({
  definitionSnapshot: FormDefinitionSchema,
  themeSnapshot: ThemeDefinitionSchema,
});
export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

const listResponseSchema = successSchema.extend({
  submissions: z.array(SubmissionListItemSchema),
  totalCount: z.number().int().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

const detailResponseSchema = successSchema.extend({
  submission: SubmissionDetailSchema,
});

export interface FetchSubmissionsResult {
  submissions: SubmissionListItem[];
  totalCount: number;
}

export async function fetchFormSubmissions(
  formId: string,
  options?: { limit?: number; offset?: number; signal?: AbortSignal },
): Promise<FetchSubmissionsResult> {
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

  return {
    submissions: response.submissions,
    totalCount: response.totalCount ?? response.submissions.length,
  };
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
