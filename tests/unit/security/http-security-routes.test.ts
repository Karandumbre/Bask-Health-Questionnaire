import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as formsGetHandler, POST as formsPostHandler } from "@/app/api/admin/forms/route";
import {
  PATCH as formPatchHandler,
} from "@/app/api/admin/forms/[formId]/route";
import { POST as publishHandler } from "@/app/api/admin/forms/[formId]/publish/route";
import { GET as responsesGetHandler } from "@/app/api/admin/forms/[formId]/responses/route";

// Mock Supabase Server client and admin auth guards
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  getServerVerifiedUser: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn(),
  requireWorkspaceMembership: vi.fn(),
  requireFormWorkspaceAccess: vi.fn(),
  getUserWorkspaces: vi.fn(),
}));

import {
  requireAdmin,
  requireWorkspaceMembership,
  requireFormWorkspaceAccess,
} from "@/lib/auth/admin";
import { AppError } from "@/lib/errors";

describe("HTTP Administrative Mutation & Response Security Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (
    url: string,
    options: {
      method?: string;
      body?: unknown;
      origin?: string;
      host?: string;
    } = {}
  ) => {
    const { method = "GET", body, origin = "http://localhost:3000", host = "localhost:3000" } = options;
    const headers = new Headers();
    if (host) headers.set("host", host);
    if (origin) headers.set("origin", origin);
    if (body) headers.set("content-type", "application/json");

    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  describe("CSRF / Origin Header Verification (SEC-03)", () => {
    it("rejects mutating POST request with mismatched Origin header (403 FORBIDDEN)", async () => {
      const evilRequest = createRequest("/api/admin/forms", {
        method: "POST",
        origin: "http://malicious-attacker.com",
        host: "localhost:3000",
        body: { name: "Compromised Form" },
      });

      const response = await formsPostHandler(evilRequest);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toContain("Cross-site mutation rejected");
    });

    it("rejects mutating PATCH request with mismatched Origin header", async () => {
      const evilRequest = createRequest("/api/admin/forms/f_1", {
        method: "PATCH",
        origin: "https://phishing-clinic.org",
        host: "localhost:3000",
        body: { expectedRevision: 1 },
      });

      const response = await formPatchHandler(evilRequest, {
        params: Promise.resolve({ formId: "f_1" }),
      });
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Authentication Enforcement (SEC-04)", () => {
    it("rejects unauthenticated user from listing forms (401 UNAUTHORIZED)", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new AppError("UNAUTHORIZED", "Authentication required for administrative access.", 401)
      );

      const request = createRequest("/api/admin/forms");
      const response = await formsGetHandler(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated user from autosaving draft (401 UNAUTHORIZED)", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new AppError("UNAUTHORIZED", "Authentication required for administrative access.", 401)
      );

      const request = createRequest("/api/admin/forms/f_1", {
        method: "PATCH",
        body: { expectedRevision: 2, definition: {}, theme: {} },
      });
      const response = await formPatchHandler(request, {
        params: Promise.resolve({ formId: "f_1" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated user from publishing form (401 UNAUTHORIZED)", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new AppError("UNAUTHORIZED", "Authentication required for administrative access.", 401)
      );

      const request = createRequest("/api/admin/forms/f_1/publish", {
        method: "POST",
        body: { expectedRevision: 2 },
      });
      const response = await publishHandler(request, {
        params: Promise.resolve({ formId: "f_1" }),
      });

      expect(response.status).toBe(401);
    });

    it("rejects unauthenticated user from accessing patient responses (401 UNAUTHORIZED)", async () => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(
        new AppError("UNAUTHORIZED", "Authentication required for administrative access.", 401)
      );

      const request = createRequest("/api/admin/forms/f_1/responses");
      const response = await responsesGetHandler(request, {
        params: Promise.resolve({ formId: "f_1" }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Workspace Isolation & Authorization (SEC-01)", () => {
    it("rejects user who is not a member of the workspace (403 FORBIDDEN)", async () => {
      vi.mocked(requireAdmin).mockResolvedValueOnce({
        id: "usr_attacker",
        email: "attacker@external.com",
        role: "authenticated",
        claims: { sub: "usr_attacker" },
      });
      vi.mocked(requireWorkspaceMembership).mockRejectedValueOnce(
        new AppError("FORBIDDEN", "Access denied: You are not a member of this workspace.", 403, {
          resourceType: "workspace",
        })
      );

      const request = createRequest("/api/admin/forms?workspaceId=ws_foreign");
      const response = await formsGetHandler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.details?.resourceType).toBe("workspace");
    });

    it("rejects reading responses of a form owned by another workspace (403 FORBIDDEN)", async () => {
      vi.mocked(requireAdmin).mockResolvedValueOnce({
        id: "usr_cross_tenant",
        email: "other@tenant.com",
        role: "authenticated",
        claims: { sub: "usr_cross_tenant" },
      });
      vi.mocked(requireFormWorkspaceAccess).mockRejectedValueOnce(
        new AppError("FORBIDDEN", "Access denied: You are not a member of this workspace.", 403, {
          resourceType: "workspace",
        })
      );

      const request = createRequest("/api/admin/forms/f_victim/responses");
      const response = await responsesGetHandler(request, {
        params: Promise.resolve({ formId: "f_victim" }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Request Body Validation", () => {
    it("rejects autosave PATCH without integer expectedRevision (400 INVALID_FORM)", async () => {
      vi.mocked(requireAdmin).mockResolvedValueOnce({
        id: "usr_admin",
        email: "admin@bask.com",
        role: "authenticated",
        claims: { sub: "usr_admin" },
      });

      const request = createRequest("/api/admin/forms/f_1", {
        method: "PATCH",
        body: {
          definition: { title: "Title", questions: [] },
          theme: {},
          // missing expectedRevision
        },
      });

      const response = await formPatchHandler(request, {
        params: Promise.resolve({ formId: "f_1" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_FORM");
      expect(data.error.message).toContain("expectedRevision");
    });

    it("rejects publish POST without integer expectedRevision (400 INVALID_FORM)", async () => {
      vi.mocked(requireAdmin).mockResolvedValueOnce({
        id: "usr_admin",
        email: "admin@bask.com",
        role: "authenticated",
        claims: { sub: "usr_admin" },
      });
      vi.mocked(requireFormWorkspaceAccess).mockResolvedValueOnce({
        form: {} as any,
        membership: {} as any,
      });

      const request = createRequest("/api/admin/forms/f_1/publish", {
        method: "POST",
        body: {}, // missing expectedRevision
      });

      const response = await publishHandler(request, {
        params: Promise.resolve({ formId: "f_1" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_FORM");
    });
  });
});
