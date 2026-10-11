import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFormsCache,
  fetchAndCacheForms,
  readFormsCache,
} from "@/features/forms/client/forms-cache";
import { APPLICATION } from "@/lib/constants/application";
import type { FormListItem } from "@/features/forms/domain/dashboard-types";

const forms: FormListItem[] = [
  {
    id: "form",
    name: "Intake",
    workspaceId: "workspace",
    latestPublishedVersionNumber: null,
    createdAt: "2026-10-11",
    updatedAt: "2026-10-11",
    draftRevision: 1,
    draftUpdatedAt: null,
  },
];

describe("forms list cache", () => {
  beforeEach(() => {
    clearFormsCache();
    vi.restoreAllMocks();
  });
  it("scopes cached lists to user and workspace and expires freshness", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    await fetchAndCacheForms(
      "user:workspace",
      async () => forms,
      new AbortController().signal,
    );
    expect(readFormsCache("other:workspace")).toBeUndefined();
    expect(readFormsCache("user:other")).toBeUndefined();
    expect(readFormsCache("user:workspace")).toMatchObject({
      forms,
      fresh: true,
    });
    now.mockReturnValue(1000 + APPLICATION.formsCacheFreshMs);
    expect(readFormsCache("user:workspace")).toMatchObject({
      forms,
      fresh: false,
    });
  });
  it("keeps the last list when a refresh fails", async () => {
    const signal = new AbortController().signal;
    await fetchAndCacheForms("user:workspace", async () => forms, signal);
    await expect(
      fetchAndCacheForms(
        "user:workspace",
        async () => {
          throw new Error("offline");
        },
        signal,
      ),
    ).rejects.toThrow("offline");
    expect(readFormsCache("user:workspace")?.forms).toEqual(forms);
  });
  it.each(["invalidate", "abort"])(
    "rejects a late refresh after %s",
    async (action) => {
      const controller = new AbortController();
      let resolve!: (forms: FormListItem[]) => void;
      const request = fetchAndCacheForms(
        "user:workspace",
        () =>
          new Promise((done) => {
            resolve = done;
          }),
        controller.signal,
      );
      if (action === "invalidate") clearFormsCache();
      else controller.abort();
      resolve(forms);
      expect(await request).toBeNull();
      expect(readFormsCache("user:workspace")).toBeUndefined();
    },
  );
});
