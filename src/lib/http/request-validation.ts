import { APP_MESSAGES } from "@/lib/constants/messages";
import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors";

export async function parseRequestJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError(
      "INVALID_FORM",
      APP_MESSAGES.REQUEST_BODY_MUST_BE_VALID_JSON,
      400,
    );
  }
  return schema.parse(body);
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .default(0),
});
