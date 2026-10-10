import { describe, expect, it, vi } from "vitest";
import { DraftAutosave } from "@/features/forms/client/draft-autosave";
import { ApiError } from "@/lib/http/api-client";
import { APP_MESSAGES } from "@/lib/constants/messages";

describe("Recoverable save feedback", () => {
  it("preserves edits and clears the API error only after an explicit successful retry", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError("Connection interrupted", 0, "NETWORK_ERROR"),
      )
      .mockResolvedValueOnce(4);
    const controller = new DraftAutosave<string>("original", 3, save);
    controller.update("patient's latest answers");
    expect(await controller.flush()).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      revision: 3,
      errorMessage: "Connection interrupted",
    });
    expect(controller.getAcknowledgedSnapshot()).toBe("original");
    expect(await controller.flush()).toBe(true);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual([
      "patient's latest answers",
      3,
    ]);
    expect(controller.getSnapshot()).toMatchObject({
      status: "saved",
      revision: 4,
      errorMessage: null,
    });
    controller.pause();
  });

  it("never exposes unexpected internal errors to the UI", async () => {
    const controller = new DraftAutosave<string>(
      "original",
      3,
      vi.fn().mockRejectedValue(new Error("private diagnostic")),
    );
    controller.update("edit");
    await controller.flush();
    expect(controller.getSnapshot().errorMessage).toBe(
      APP_MESSAGES.DRAFT_SAVE_FAILED,
    );
    controller.pause();
  });

  it("blocks retry after a revision conflict until it is explicitly resolved", async () => {
    const save = vi.fn().mockRejectedValue(
      new ApiError("Session changed", 409, "REVISION_CONFLICT", {
        currentRevision: 6,
      }),
    );
    const controller = new DraftAutosave<string>("original", 3, save);
    controller.update("edit");
    await controller.flush();
    expect(await controller.flush()).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "conflict",
      errorMessage: "Session changed",
    });
    controller.pause();
  });
});
