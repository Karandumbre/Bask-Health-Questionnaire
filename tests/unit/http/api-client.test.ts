import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, ApiError } from "@/lib/http/api-client";

const resultSchema = z.object({ success: z.literal(true), revision: z.number().int() });

describe("API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("validates successful data and sends JSON with caller headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, revision: 4 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await apiRequest("/api/form", resultSchema, { method: "PATCH", json: { name: "Intake" }, headers: { "X-Test": "yes" } })).toEqual({ success: true, revision: 4 });
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.body).toBe('{"name":"Intake"}');
    expect(new Headers(options.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(options.headers).get("X-Test")).toBe("yes");
  });

  it("preserves status, code and conflict details from server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: false, error: { code: "REVISION_CONFLICT", message: "Changed elsewhere", details: { currentRevision: 7 } } }, { status: 409 })));
    await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject({ status: 409, code: "REVISION_CONFLICT", details: { currentRevision: 7 }, message: "Changed elsewhere" });
  });

  it("rejects HTTP errors even if the body looks successful", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true, revision: 4 }, { status: 500 })));
    await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject({ status: 500, code: "HTTP_ERROR" });
  });

  it("handles non-JSON responses without leaking the response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>private server error</html>", { status: 502 })));
    await expect(apiRequest("/api/form", resultSchema)).rejects.toMatchObject({ status: 502, code: "INVALID_RESPONSE" });
  });

  it("rejects malformed success data rather than returning unchecked JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true, revision: "four" })));
    await expect(apiRequest("/api/form", resultSchema)).rejects.toBeInstanceOf(ApiError);
  });
});
