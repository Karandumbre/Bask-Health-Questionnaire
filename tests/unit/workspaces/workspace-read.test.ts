import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  execute: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { select: mocks.select, transaction: mocks.transaction },
}));
import { getUserWorkspaces } from "@/features/workspaces/server/workspace-service";

const membership = {
  workspaceId: "workspace",
  role: "owner",
  workspaceName: "Clinic",
  createdAt: new Date(),
};
function selection(rows: unknown[]) {
  return { from: () => ({ innerJoin: () => ({ where: async () => rows }) }) };
}

describe("workspace read fast path", () => {
  beforeEach(() => vi.resetAllMocks());
  it("reads existing memberships without a provisioning transaction", async () => {
    mocks.select.mockReturnValue(selection([membership]));
    expect(await getUserWorkspaces("user")).toEqual([membership]);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rechecks under the lock so simultaneous first visits do not create duplicates", async () => {
    mocks.select.mockReturnValue(selection([]));
    const select = vi.fn(() => selection([membership]));
    mocks.transaction.mockImplementation(async (run) =>
      run({ select, execute: mocks.execute, insert: mocks.insert }),
    );
    expect(await getUserWorkspaces("user")).toEqual([membership]);
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not provision when the initial membership lookup fails", async () => {
    mocks.select.mockImplementation(() => {
      throw new Error("database unavailable");
    });
    await expect(getUserWorkspaces("user")).rejects.toThrow(
      "database unavailable",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
