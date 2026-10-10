import { describe, expect, it } from "vitest";
import {
  parseRequestJson,
  paginationSchema,
} from "@/lib/http/request-validation";
import {
  renameFormSchema,
  publishRequestSchema,
} from "@/features/forms/domain/request-schemas";
import { handleRouteError } from "@/lib/errors/route-handler";

describe("Request boundary validation", () => {
  it("rejects invalid JSON with a safe 400 error", async () => {
    await expect(
      parseRequestJson(
        new Request("http://localhost", { method: "POST", body: "{" }),
        renameFormSchema,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("requires a revision for renames and a valid operation ID for publication", () => {
    expect(renameFormSchema.safeParse({ name: "Renamed" }).success).toBe(false);
    expect(
      publishRequestSchema.safeParse({
        expectedRevision: 1.5,
        operationId: "invalid",
      }).success,
    ).toBe(false);
  });
  it("rejects malformed pagination instead of passing NaN to the database", () => {
    for (const value of ["NaN", "1.5", "-1", "101"])
      expect(paginationSchema.safeParse({ limit: value }).success).toBe(false);
    expect(paginationSchema.parse({})).toEqual({ limit: 50, offset: 0 });
  });
  it("maps schema errors to a safe 422 response", async () => {
    const parsed = renameFormSchema.safeParse({
      name: "",
      expectedRevision: -1,
    });
    if (parsed.success) throw new Error("Expected schema failure");
    const response = handleRouteError(parsed.error);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "INVALID_FORM" },
    });
  });
});
