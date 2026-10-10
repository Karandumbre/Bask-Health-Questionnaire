import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    key: "public-fixture-key",
  }),
}));
import { updateSession } from "@/lib/supabase/proxy";

describe("Proxy refresh failure isolation", () => {
  it("allows public routing after a refresh outage without granting an authenticated identity", async () => {
    getUser.mockRejectedValueOnce(new Error("private upstream failure"));
    const response = await updateSession(
      new NextRequest("http://localhost/intake/fixture"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.cookies.getAll()).toEqual([]);
    expect(await response.text()).not.toContain("private upstream failure");
  });
});
