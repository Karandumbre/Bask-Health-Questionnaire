import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
} from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  apiClient,
  apiRequest,
  ApiError,
  apiErrorMessage,
} from "@/lib/http/api-client";

const resultSchema = z.object({
  success: z.literal(true),
  revision: z.number().int(),
});
const originalAdapter = apiClient.defaults.adapter;

// Replace only transport, so the real request/response interceptors still run.
function respond(data: unknown, status = 200) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const response: AxiosResponse = {
      data,
      status,
      statusText: "",
      headers: new AxiosHeaders(),
      config,
    };
    if (status < 200 || status >= 300) {
      throw new AxiosError(
        "HTTP failure",
        AxiosError.ERR_BAD_RESPONSE,
        config,
        {},
        response,
      );
    }
    return response;
  });
  apiClient.defaults.adapter = adapter;
  return adapter;
}

describe("API client", () => {
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("validates successful data and sends JSON with caller headers and a timeout", async () => {
    const adapter = respond({ success: true, revision: 4 });
    expect(
      await apiRequest("/api/form", resultSchema, {
        method: "PATCH",
        json: { name: "Intake" },
        headers: { "X-Test": "yes" },
      }),
    ).toEqual({ success: true, revision: 4 });
    const config = adapter.mock.calls[0]![0];
    expect(config.data).toBe('{"name":"Intake"}');
    expect(config.headers.get("Content-Type")).toBe("application/json");
    expect(config.headers.get("Accept")).toBe("application/json");
    expect(config.headers.get("X-Test")).toBe("yes");
    expect(config.timeout).toBe(30_000);
  });

  it.each([200, 409])(
    "preserves conflict details from an error envelope with status %i",
    async (status) => {
      respond(
        {
          success: false,
          error: {
            code: "REVISION_CONFLICT",
            message: "Changed elsewhere",
            details: { currentRevision: 7 },
          },
        },
        status,
      );
      await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject(
        {
          status,
          code: "REVISION_CONFLICT",
          details: { currentRevision: 7 },
          message: "Changed elsewhere",
        },
      );
    },
  );

  it("preserves authentication errors for the login screen", async () => {
    respond(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
      },
      401,
    );
    await expect(
      apiRequest("/api/auth/login", resultSchema),
    ).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Invalid credentials",
    });
  });

  it("rejects HTTP errors even if the body looks successful", async () => {
    respond({ success: true, revision: 4 }, 500);
    await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject({
      status: 500,
      code: "HTTP_ERROR",
    });
  });

  it.each([200, 502])(
    "handles non-JSON responses without leaking the body (status %i)",
    async (status) => {
      respond("<html>private server error</html>", status);
      await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject(
        {
          status,
          code: "INVALID_RESPONSE",
          message: "The server returned an unreadable response. Please retry.",
        },
      );
    },
  );

  it("rejects malformed success data rather than returning unchecked JSON", async () => {
    respond({ success: true, revision: "four" });
    await expect(apiRequest("/api/form", resultSchema)).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it.each([
    [AxiosError.ERR_NETWORK, "NETWORK_ERROR"],
    [AxiosError.ECONNABORTED, "TIMEOUT"],
    [AxiosError.ETIMEDOUT, "TIMEOUT"],
  ])("normalizes transport failure %s", async (axiosCode, code) => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError("private transport details", axiosCode, config);
    };
    await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject({
      status: 0,
      code,
    });
  });

  it("keeps aborted requests recognizable and does not dispatch them", async () => {
    const adapter = respond({ success: true, revision: 4 });
    const controller = new AbortController();
    controller.abort();
    const error = await apiRequest("/api/form", resultSchema, {
      signal: controller.signal,
    }).catch((reason: unknown) => reason);
    expect(axios.isCancel(error)).toBe(true);
    expect(adapter).not.toHaveBeenCalled();
    expect(apiErrorMessage(error, "fallback")).toBe("fallback");
  });

  it("preserves cancellation during an in-flight request", async () => {
    const controller = new AbortController();
    apiClient.defaults.adapter = async () => {
      controller.abort();
      throw new axios.CanceledError();
    };
    const error = await apiRequest("/api/form", resultSchema, {
      signal: controller.signal,
    }).catch((reason: unknown) => reason);
    expect(axios.isCancel(error)).toBe(true);
  });
});
