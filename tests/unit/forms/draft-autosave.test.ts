import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DraftAutosave,
  type AutosaveState,
} from "@/features/forms/client/draft-autosave";
import { ApiError } from "@/lib/http/api-client";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("Draft Autosave Reliability — Controlled Concurrency & State Invariants", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // 1. Editing during an in-flight save
  it("Scenario 1: Editing during an in-flight save chains a follow-up save with the acknowledged revision", async () => {
    const first = deferred<number>();
    const second = deferred<number>();
    const save = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const autosave = new DraftAutosave<string>("initial", 3, save);
    autosave.update("first edit");
    expect(autosave.getAcknowledgedSnapshot()).toBe("initial");
    const done = autosave.flush();

    // While first request is in-flight, second edit arrives
    autosave.update("second edit");
    await vi.advanceTimersByTimeAsync(800);

    // Only first save was dispatched so far
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.slice(0, 2)).toEqual(["first edit", 3]);

    // First save completes with revision 4
    first.resolve(4);
    await vi.advanceTimersByTimeAsync(0);

    // Second save is immediately dispatched using the new acknowledged revision 4
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual(["second edit", 4]);
    expect(autosave.getSnapshot().status).toBe("saving");
    expect(autosave.getAcknowledgedSnapshot()).toBe("first edit");

    // Second save completes with revision 5
    second.resolve(5);
    expect(await done).toBe(true);
    expect(autosave.getAcknowledgedSnapshot()).toBe("second edit");
    expect(autosave.getSnapshot()).toMatchObject({
      revision: 5,
      status: "saved",
    });
  });

  // 2. Multiple rapid edits
  it("Scenario 2: Multiple rapid edits within the debounce window coalesce into a single save", async () => {
    const response = deferred<number>();
    const save = vi.fn().mockReturnValue(response.promise);
    const autosave = new DraftAutosave<string>("initial", 10, save, 800);

    // 5 rapid keystrokes within 500ms
    autosave.update("edit 1");
    await vi.advanceTimersByTimeAsync(100);
    autosave.update("edit 2");
    await vi.advanceTimersByTimeAsync(100);
    autosave.update("edit 3");
    await vi.advanceTimersByTimeAsync(100);
    autosave.update("edit 4");
    await vi.advanceTimersByTimeAsync(100);
    autosave.update("edit 5 (final)");

    // Before debounce expires, no save dispatched
    expect(save).not.toHaveBeenCalled();

    // Advance past the 800ms debounce
    await vi.advanceTimersByTimeAsync(800);

    // Exactly one save dispatched with the final snapshot
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.slice(0, 2)).toEqual(["edit 5 (final)", 10]);

    response.resolve(11);
    await vi.advanceTimersByTimeAsync(0);
    expect(autosave.getSnapshot().status).toBe("saved");
    expect(autosave.getSnapshot().revision).toBe(11);
  });

  // 3. Network failure and retry
  it("Scenario 3: Network failure preserves dirty edits and retry sends the latest snapshot", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("Network timeout / 503 Service Unavailable"),
      )
      .mockResolvedValueOnce(8);

    const autosave = new DraftAutosave<string>("initial", 7, save);
    autosave.update("valuable clinical edit");

    // Save fails
    expect(await autosave.flush()).toBe(false);
    expect(autosave.getSnapshot().status).toBe("failed");

    // Local edits are NOT lost: user adds more text
    autosave.update("valuable clinical edit + additional note");

    // Manual retry
    expect(await autosave.flush()).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual([
      "valuable clinical edit + additional note",
      7,
    ]);
    expect(autosave.getSnapshot().status).toBe("saved");
    expect(autosave.getSnapshot().revision).toBe(8);
  });

  // 4. Reload immediately after editing
  it("Scenario 4: Reload immediately after editing cancels pending saves and restores server state", async () => {
    const response = deferred<number>();
    const save = vi.fn().mockReturnValue(response.promise);
    const autosave = new DraftAutosave<string>("server v1", 1, save);

    // User edits
    autosave.update("uncommitted local edit");
    const savePromise = autosave.flush();

    const signal = save.mock.calls[0]?.[2] as AbortSignal;
    expect(signal.aborted).toBe(false);

    // Admin clicks Reload or reset is triggered
    autosave.reset("fresh server snapshot v2", 2);
    expect(autosave.getAcknowledgedSnapshot()).toBe("fresh server snapshot v2");

    // In-flight save was aborted
    expect(signal.aborted).toBe(true);

    // Save promise finishes cleanly as false
    response.resolve(2);
    expect(await savePromise).toBe(false);

    // State is cleanly restored to server snapshot
    expect(autosave.getSnapshot()).toMatchObject({
      revision: 2,
      status: "saved",
      conflict: null,
    });
  });

  // 5. Server revision conflict
  it("Scenario 5: Server revision conflict (HTTP 409) halts automatic saves and preserves local edits", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError("Conflict", 409, "REVISION_CONFLICT", {
          currentRevision: 15,
        }),
      )
      .mockResolvedValueOnce(16);

    const autosave = new DraftAutosave<string>("initial", 10, save);
    autosave.update("conflicting edit");

    expect(await autosave.flush()).toBe(false);
    expect(autosave.getSnapshot().status).toBe("conflict");
    expect(autosave.getAcknowledgedSnapshot()).toBe("initial");
    expect(autosave.getSnapshot().conflict).toMatchObject({
      serverRevision: 15,
      localRevision: 10,
    });

    // Further local updates do NOT trigger automatic saves during conflict
    autosave.update("another edit during conflict");
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(1);

    // Only explicit forceSave sends the update against the server revision
    expect(await autosave.forceSave(15)).toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.slice(0, 2)).toEqual([
      "another edit during conflict",
      15,
    ]);
    expect(autosave.getSnapshot().status).toBe("saved");
    expect(autosave.getSnapshot().revision).toBe(16);
  });

  // 6. Out-of-order acknowledgement handling
  it("Scenario 6: Out-of-order and non-advancing responses are rejected and cannot regress state", async () => {
    // Server returns a revision equal to or lower than expected revision (stale/out-of-order)
    const save = vi.fn().mockResolvedValueOnce(3); // Expected was 3, response returned 3 (did not advance)
    const autosave = new DraftAutosave<string>("initial", 3, save);
    autosave.update("new edit");

    expect(await autosave.flush()).toBe(false);
    expect(autosave.getSnapshot().status).toBe("failed");
    expect(autosave.getSnapshot().revision).toBe(3); // Did not corrupt revision
  });

  // 7. Navigation with unsaved changes
  it("Scenario 7: Unsaved changes flag tracks editing and saving states accurately", async () => {
    const response = deferred<number>();
    const save = vi.fn().mockReturnValue(response.promise);
    const autosave = new DraftAutosave<string>("initial", 1, save, 800);

    const hasUnsavedChanges = (state: AutosaveState) =>
      state.status !== "saved";

    // Initially clean
    expect(hasUnsavedChanges(autosave.getSnapshot())).toBe(false);

    // User types: transitions to 'editing'
    autosave.update("dirty edit");
    expect(autosave.getSnapshot().status).toBe("editing");
    expect(hasUnsavedChanges(autosave.getSnapshot())).toBe(true);

    // Debounce triggers: transitions to 'saving'
    const flushPromise = autosave.flush();
    expect(autosave.getSnapshot().status).toBe("saving");
    expect(hasUnsavedChanges(autosave.getSnapshot())).toBe(true);

    // Server acknowledges: transitions to 'saved'
    response.resolve(2);
    await flushPromise;
    expect(autosave.getSnapshot().status).toBe("saved");
    expect(hasUnsavedChanges(autosave.getSnapshot())).toBe(false);
  });

  // 8. Saved indicator accuracy
  it("Scenario 8: Saved indicator displays only when all local edits are committed to the server", async () => {
    const snapshots: string[] = [];
    const first = deferred<number>();
    const second = deferred<number>();
    const save = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const autosave = new DraftAutosave<string>("clean", 1, save);
    autosave.subscribe(() => {
      snapshots.push(autosave.getSnapshot().status);
    });

    // Initial state is 'saved'
    expect(autosave.getSnapshot().status).toBe("saved");

    // Edit 1
    autosave.update("edit 1");
    expect(autosave.getSnapshot().status).toBe("editing");

    // Flush edit 1
    const done = autosave.flush();
    expect(autosave.getSnapshot().status).toBe("saving");

    // Edit 2 arrives while save 1 is in-flight
    autosave.update("edit 2");

    // Save 1 resolves: status must REMAIN 'saving' because Edit 2 is still dirty!
    first.resolve(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(autosave.getSnapshot().status).toBe("saving");

    // Save 2 resolves: NOW status finally transitions to 'saved'
    second.resolve(3);
    await done;
    expect(autosave.getSnapshot().status).toBe("saved");

    // Verified sequence of state transitions
    expect(snapshots).toContain("editing");
    expect(snapshots).toContain("saving");
    expect(snapshots[snapshots.length - 1]).toBe("saved");
  });
});
