import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSessionHandler } from "@/app/api/patient/forms/[slug]/session/route";
import { AppError } from "@/lib/errors";

const mockAuthenticate = vi.fn();
const mockParseCookie = vi.fn();
const mockDbSelect = vi.fn();

vi.mock("@/features/patients/server/session-service", () => ({
  authenticatePatientSession: (...args: unknown[]) => mockAuthenticate(...args),
  createPatientSession: vi.fn(),
}));

vi.mock("@/features/patients/server/patient-cookies", () => ({
  getSessionCookieName: (slug: string) => `bask_session_${slug}`,
  parseSessionCookie: (...args: unknown[]) => mockParseCookie(...args),
  setSessionCapabilityCookie: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => mockDbSelect(),
  },
}));

describe("Patient Session Inspection Route (GET)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (slug: string, cookieValue?: string) => {
    const headers = new Headers();
    if (cookieValue) {
      headers.set("cookie", `bask_session_${slug}=${cookieValue}`);
    }
    return new NextRequest(
      new URL(`http://localhost:3000/api/patient/forms/${slug}/session`),
      { headers },
    );
  };

  it("returns active: false when cookie is missing", async () => {
    mockParseCookie.mockReturnValueOnce(null);
    const req = createRequest("form-1");
    const res = await getSessionHandler(req, {
      params: Promise.resolve({ slug: "form-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.active).toBe(false);
  });

  it("returns active: false when credentials are unauthorized or expired", async () => {
    mockParseCookie.mockReturnValueOnce({
      sessionId: "s_1",
      capabilityToken: "token_1",
    });
    mockAuthenticate.mockRejectedValueOnce(
      AppError.sessionUnauthorized("Invalid credentials"),
    );

    const req = createRequest("form-1", "s_1:token_1");
    const res = await getSessionHandler(req, {
      params: Promise.resolve({ slug: "form-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.active).toBe(false);
  });

  it("propagates unexpected database error as HTTP 500 without returning active: false", async () => {
    mockParseCookie.mockReturnValueOnce({
      sessionId: "s_1",
      capabilityToken: "token_1",
    });
    mockAuthenticate.mockRejectedValueOnce(
      new Error("connection timeout to postgres pool"),
    );

    const req = createRequest("form-1", "s_1:token_1");
    const res = await getSessionHandler(req, {
      params: Promise.resolve({ slug: "form-1" }),
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.data).toBeUndefined();
  });

  it("returns status: completed and attaches submission info when session is already submitted", async () => {
    mockParseCookie.mockReturnValueOnce({
      sessionId: "s_completed",
      capabilityToken: "token_valid",
    });
    mockAuthenticate.mockResolvedValueOnce({
      id: "s_completed",
      sessionReference: "BKS-1234-5678",
      publishedVersionId: "ver_1",
      status: "completed",
      revision: 3,
      answerJson: { q_name: "Alice" },
    });

    const mockLimit = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "ver_1",
          publicSlug: "form-1",
          versionNumber: 1,
          definitionSnapshot: { title: "Title", questions: [] },
          themeSnapshot: {},
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "sub_1",
          submittedAt: new Date("2026-10-10T12:00:00Z"),
        },
      ]);

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: mockLimit,
        }),
      }),
    });

    const req = createRequest("form-1", "s_completed:token_valid");
    const res = await getSessionHandler(req, {
      params: Promise.resolve({ slug: "form-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.active).toBe(true);
    expect(json.data.status).toBe("completed");
    expect(json.data.submission?.submissionId).toBe("sub_1");
  });
});
