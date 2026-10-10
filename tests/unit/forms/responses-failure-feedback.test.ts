import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { APP_MESSAGES } from "@/lib/constants/messages";

const listSubmissions = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: async () => ({ id: "fixture-user" }),
  requireFormWorkspaceAccess: async () => ({
    form: { id: "fixture-form", name: "Fixture form" },
  }),
}));
vi.mock("@/features/forms/server/response-service", () => ({
  listFormSubmissions: listSubmissions,
  countFormSubmissions: vi.fn().mockResolvedValue(0),
}));
import ResponsesPage from "@/app/(admin)/admin/forms/[formId]/responses/page";

describe("Responses failure feedback", () => {
  it("shows a safe retry alert instead of claiming there are no responses after a server failure", async () => {
    listSubmissions.mockRejectedValueOnce(
      new Error("private database diagnostic"),
    );
    const page = await ResponsesPage({
      params: Promise.resolve({ formId: "fixture-form" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain(APP_MESSAGES.RESPONSES_LOAD_FAILED);
    expect(html).toContain('role="alert"');
    expect(html).toContain(APP_MESSAGES.RETRY);
    expect(html).not.toContain("No Responses Yet");
    expect(html).not.toContain("private database diagnostic");
  });
});
