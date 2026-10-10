import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftAutosave } from "@/features/forms/client/draft-autosave";
import { ApiError } from "@/lib/http/api-client";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("draft autosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves edits made during a slow request with its acknowledged revision", async () => {
    const first = deferred<number>();
    const second = deferred<number>();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const autosave = new DraftAutosave<string>("initial", 3, save);
    autosave.update("first edit");
    const done = autosave.flush();
    autosave.update("second edit");
    // The debounce expires while the first request is still in flight.
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve(4);
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual(["second edit", 4]);
    expect(autosave.getSnapshot().status).toBe("saving");
    second.resolve(5);
    expect(await done).toBe(true);
    expect(autosave.getSnapshot()).toMatchObject({ revision: 5, status: "saved" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("coalesces pending changes and serializes simultaneous manual saves", async () => {
    const response = deferred<number>();
    const save = vi.fn().mockReturnValue(response.promise);
    const autosave = new DraftAutosave<string>("initial", 0, save);
    autosave.update("first");
    autosave.update("latest");
    const firstFlush = autosave.flush();
    const secondFlush = autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.slice(0, 2)).toEqual(["latest", 0]);
    response.resolve(1);
    expect(await firstFlush).toBe(true);
    expect(await secondFlush).toBe(true);
  });

  it("keeps failed edits dirty so manual retry sends the latest snapshot", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(8);
    const autosave = new DraftAutosave<string>("initial", 7, save);
    autosave.update("unsaved");
    expect(await autosave.flush()).toBe(false);
    expect(autosave.getSnapshot().status).toBe("failed");
    expect(await autosave.flush()).toBe(true);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual(["unsaved", 7]);
  });

  it("pauses writes on conflict until the user explicitly keeps their edits", async () => {
    const save = vi.fn().mockRejectedValueOnce(new ApiError("Changed elsewhere", 409, "REVISION_CONFLICT", { currentRevision: 6 })).mockResolvedValueOnce(7);
    const autosave = new DraftAutosave<string>("initial", 2, save);
    autosave.update("local edit");
    expect(await autosave.flush()).toBe(false);
    autosave.update("newer local edit");
    await vi.advanceTimersByTimeAsync(2000);
    expect(await autosave.flush()).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.getSnapshot().conflict).toMatchObject({ serverRevision: 6, localRevision: 2 });
    expect(await autosave.forceSave(6)).toBe(true);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual(["newer local edit", 6]);
  });

  it("reload discards local changes and cancels queued saves", async () => {
    const save = vi.fn();
    const autosave = new DraftAutosave<string>("initial", 1, save);
    autosave.update("discarded");
    autosave.reset("server version", 9);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
    expect(await autosave.flush()).toBe(true);
    expect(autosave.getSnapshot()).toMatchObject({ revision: 9, status: "saved" });
  });

  it("cancels pending saves on unmount and ignores an aborted response", async () => {
    const response = deferred<number>();
    const save = vi.fn().mockReturnValue(response.promise);
    const autosave = new DraftAutosave<string>("initial", 1, save);
    autosave.update("pending");
    autosave.pause();
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
    autosave.resume();
    const done = autosave.flush();
    const signal = save.mock.calls[0]?.[2] as AbortSignal;
    autosave.pause();
    expect(signal.aborted).toBe(true);
    response.resolve(2);
    expect(await done).toBe(false);
    expect(autosave.getSnapshot().revision).toBe(1);
  });

  it("does not acknowledge a malformed revision", async () => {
    const autosave = new DraftAutosave<string>("initial", 2, async () => 2);
    autosave.update("pending");
    expect(await autosave.flush()).toBe(false);
    expect(autosave.getSnapshot()).toMatchObject({ revision: 2, status: "failed" });
  });
});
