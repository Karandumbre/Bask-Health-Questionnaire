import { APP_MESSAGES } from "@/lib/constants/messages";
import { ApiError } from "@/lib/http/api-client";

export type SaveStatus =
  "saved" | "editing" | "saving" | "failed" | "conflict" | "offline";
export interface ConflictDetails {
  serverRevision: number;
  localRevision: number;
  message?: string;
}
export interface AutosaveState {
  revision: number;
  status: SaveStatus;
  lastSavedAt: Date | null;
  conflict: ConflictDetails | null;
}

/** Serializes writes and tracks acknowledged edits separately from newer edits. */
export class DraftAutosave<T> {
  private latest: T;
  private acknowledged: T;
  private editVersion = 0;
  private savedVersion = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<boolean> | null = null;
  private request: AbortController | null = null;
  private active = true;
  private listeners = new Set<() => void>();
  private state: AutosaveState;

  constructor(
    initial: T,
    revision: number,
    private readonly save: (
      snapshot: T,
      revision: number,
      signal: AbortSignal,
    ) => Promise<number>,
    private readonly delay = 800,
    private readonly isEqual: (left: T, right: T) => boolean = Object.is,
  ) {
    this.latest = initial;
    this.acknowledged = initial;
    this.state = {
      revision,
      status: "saved",
      lastSavedAt: null,
      conflict: null,
    };
  }

  getSnapshot = () => this.state;
  getAcknowledgedSnapshot = () => this.acknowledged;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(patch: Partial<AutosaveState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  update(snapshot: T) {
    if (this.isEqual(snapshot, this.latest)) return;
    this.latest = snapshot;
    this.editVersion++;
    this.clearTimer();
    if (this.state.conflict) return;
    this.notify({ status: this.running ? "saving" : "editing" });
    if (this.active)
      this.timer = setTimeout(() => {
        void this.flush();
      }, this.delay);
  }

  flush = (): Promise<boolean> => {
    this.clearTimer();
    if (this.running) return this.running;
    if (!this.active || this.state.conflict) return Promise.resolve(false);
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  };

  private async drain(): Promise<boolean> {
    while (this.active && this.savedVersion !== this.editVersion) {
      const version = this.editVersion;
      const snapshot = this.latest;
      const expectedRevision = this.state.revision;
      const request = new AbortController();
      this.request = request;
      this.notify({ status: "saving" });
      try {
        const revision = await this.save(
          snapshot,
          expectedRevision,
          request.signal,
        );
        if (request.signal.aborted) return false;
        if (!Number.isSafeInteger(revision) || revision <= expectedRevision) {
          throw new Error(
            APP_MESSAGES.THE_SAVE_RESPONSE_DID_NOT_ADVANCE_THE_DRAFT_REVISION,
          );
        }
        this.savedVersion = version;
        this.acknowledged = snapshot;
        this.notify({ revision, lastSavedAt: new Date() });
        // Edits made during this request are still dirty. Save them using the
        // acknowledged revision before reporting that the draft is saved.
      } catch (error) {
        if (request.signal.aborted) return false;
        if (error instanceof ApiError && error.status === 409) {
          const currentRevision = error.details?.currentRevision;
          this.notify({
            status: "conflict",
            conflict: {
              serverRevision:
                typeof currentRevision === "number"
                  ? currentRevision
                  : expectedRevision,
              localRevision: expectedRevision,
              message: error.message,
            },
          });
        } else {
          this.notify({ status: "failed" });
        }
        this.clearTimer();
        return false;
      } finally {
        if (this.request === request) this.request = null;
      }
    }
    if (!this.active) return false;
    this.clearTimer();
    this.notify({ status: "saved", conflict: null });
    return true;
  }

  forceSave = (revision: number): Promise<boolean> => {
    this.notify({ revision, conflict: null });
    return this.flush();
  };

  saveWithMergedSnapshot = (
    snapshot: T,
    revision: number,
  ): Promise<boolean> => {
    this.latest = snapshot;
    this.editVersion++;
    this.notify({ revision, conflict: null });
    return this.flush();
  };

  reset(snapshot: T, revision: number) {
    this.clearTimer();
    this.request?.abort();
    this.latest = snapshot;
    this.editVersion++;
    this.savedVersion = this.editVersion;
    this.acknowledged = snapshot;
    this.notify({
      revision,
      status: "saved",
      conflict: null,
      lastSavedAt: new Date(),
    });
  }

  fail() {
    this.notify({ status: "failed" });
  }
  resume() {
    this.active = true;
  }
  pause() {
    this.active = false;
    this.clearTimer();
    this.request?.abort();
  }
}
