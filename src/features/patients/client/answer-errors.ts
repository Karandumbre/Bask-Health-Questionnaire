import { z } from "zod";
import { ApiError } from "@/lib/http/api-client";

const answerErrorsSchema = z.array(
  z.object({ questionId: z.string(), issue: z.string() }),
);

export function apiAnswerErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result = answerErrorsSchema.safeParse(error.details?.validationErrors);
  return result.success
    ? Object.fromEntries(
        result.data.map(({ questionId, issue }) => [questionId, issue]),
      )
    : {};
}
