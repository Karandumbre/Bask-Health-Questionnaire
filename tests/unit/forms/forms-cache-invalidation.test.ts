import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/http/api-client";
import {
  createForm,
  deleteForm,
  publishForm,
  renameForm,
  saveFormDraft,
} from "@/features/forms/client/forms-api";
import { login, logout } from "@/features/auth/client/auth-api";
import {
  clearFormsCache,
  fetchAndCacheForms,
  readFormsCache,
} from "@/features/forms/client/forms-cache";
import { generate100FieldFixture } from "../../fixtures/100-field-fixture";
import { THEME_PRESET_OCEAN } from "@/features/themes/domain/theme-tokens";

vi.mock("@/lib/http/api-client", async (importOriginal) => {
  const request = vi.fn();
  return {
    ...(await importOriginal<typeof import("@/lib/http/api-client")>()),
    apiRequest: Object.assign(request, {
      get: request,
      post: request,
      put: request,
      patch: request,
      delete: request,
    }),
  };
});

const key = "user:workspace";
const operations = [
  ["create", () => createForm("Intake")],
  ["rename", () => renameForm("form", "Renamed", 1)],
  ["delete", () => deleteForm("form")],
  ["publish", () => publishForm("form", 1, "operation")],
  [
    "save",
    () =>
      saveFormDraft(
        "form",
        { definition: generate100FieldFixture(), theme: THEME_PRESET_OCEAN },
        1,
      ),
  ],
  ["logout", () => logout()],
  ["login", () => login("demo@example.invalid", "synthetic-password")],
] as const;

describe("forms cache mutation lifecycle", () => {
  beforeEach(async () => {
    clearFormsCache();
    vi.resetAllMocks();
    await fetchAndCacheForms(key, async () => [], new AbortController().signal);
  });
  it.each(operations)(
    "clears cached lists after successful %s",
    async (_name, run) => {
      vi.mocked(apiRequest).mockResolvedValue({ success: true, revision: 2 });
      await run();
      expect(readFormsCache(key)).toBeUndefined();
    },
  );
  it("preserves the acknowledged list when a mutation fails", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("offline"));
    await expect(deleteForm("form")).rejects.toThrow("offline");
    expect(readFormsCache(key)?.forms).toEqual([]);
  });
});
