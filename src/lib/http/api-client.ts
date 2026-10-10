import { z } from "zod";

const errorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const successSchema = z.object({ success: z.literal(true) });

/** Parse responses at the network boundary; callers receive validated data. */
export async function apiRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  options: Omit<RequestInit, "body"> & { json?: unknown } = {},
): Promise<T> {
  const { json, headers: initialHeaders, ...init } = options;
  const headers = new Headers(initialHeaders);
  headers.set("Accept", "application/json");
  if (json !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("The server returned an unreadable response. Please retry.", response.status, "INVALID_RESPONSE");
  }

  const failure = errorSchema.safeParse(data);
  if (failure.success) {
    const { message, code, details } = failure.data.error;
    throw new ApiError(message, response.status, code, details);
  }
  if (!response.ok) {
    throw new ApiError("The request failed. Please retry.", response.status, "HTTP_ERROR");
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError("The server returned an unexpected response. Please retry.", response.status, "INVALID_RESPONSE");
  }
  return result.data;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
