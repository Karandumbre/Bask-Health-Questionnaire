import axios, { type AxiosRequestConfig } from "axios";
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

/** One instance keeps headers, timeouts and error handling consistent. */
export const apiClient = axios.create({ timeout: 30_000 });

apiClient.interceptors.request.use((config) => {
  config.headers.set("Accept", "application/json");
  if (config.data !== undefined)
    config.headers.set("Content-Type", "application/json");
  return config;
});

function responseError(data: unknown, status: number): ApiError | null {
  const failure = errorSchema.safeParse(data);
  if (failure.success) {
    const { message, code, details } = failure.data.error;
    return new ApiError(message, status, code, details);
  }
  if (typeof data === "string" || data === undefined || data === null) {
    return new ApiError(
      "The server returned an unreadable response. Please retry.",
      status,
      "INVALID_RESPONSE",
    );
  }
  if (status < 200 || status >= 300) {
    return new ApiError(
      "The request failed. Please retry.",
      status,
      "HTTP_ERROR",
    );
  }
  return null;
}

apiClient.interceptors.response.use(
  (response) => {
    const error = responseError(response.data, response.status);
    if (error) throw error;
    return response;
  },
  (error: unknown) => {
    // Keep cancellation recognizable; it must not become a user-facing failure.
    if (axios.isCancel(error) || error instanceof ApiError)
      return Promise.reject(error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return Promise.reject(
          responseError(error.response.data, error.response.status) ??
            new ApiError(
              "The request failed. Please retry.",
              error.response.status,
              "HTTP_ERROR",
            ),
        );
      }
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return Promise.reject(
          new ApiError("The request timed out. Please retry.", 0, "TIMEOUT"),
        );
      }
      if (error.code === "ERR_NETWORK" || error.request) {
        return Promise.reject(
          new ApiError(
            "Unable to reach the server. Check your connection and retry.",
            0,
            "NETWORK_ERROR",
          ),
        );
      }
    }
    return Promise.reject(
      new ApiError(
        "Unable to send the request. Please retry.",
        0,
        "REQUEST_ERROR",
      ),
    );
  },
);

export type ApiRequestOptions = Pick<
  AxiosRequestConfig,
  "method" | "headers" | "signal" | "timeout" | "params"
> & {
  json?: unknown;
};

/** Parse responses at the network boundary; callers receive validated data. */
export async function apiRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json, ...config } = options;
  const response = await apiClient.request<unknown>({
    ...config,
    url,
    data: json,
  });
  const result = schema.safeParse(response.data);
  if (!result.success) {
    throw new ApiError(
      "The server returned an unexpected response. Please retry.",
      response.status,
      "INVALID_RESPONSE",
    );
  }
  return result.data;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
