import { afterEach, describe, it, expect, vi } from "vitest";
import {
  getSessionPepper,
  verifySessionAccess,
} from "@/features/patients/server/session-policy";
import { hashCapabilityToken } from "@/lib/security/credentials";

describe("Shared patient session policy", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("rejects missing or weak pepper instead of silently using a default", () => {
    vi.stubEnv("APP_SESSION_PEPPER", "");
    expect(getSessionPepper).toThrow();
    vi.stubEnv("APP_SESSION_PEPPER", "weak");
    expect(getSessionPepper).toThrow();
  });
  it("validates credentials and expiration consistently", () => {
    const pepper = "x".repeat(32);
    vi.stubEnv("APP_SESSION_PEPPER", pepper);
    const session = {
      expiresAt: new Date(Date.now() + 60_000),
      credentialHash: hashCapabilityToken("valid", pepper),
    };
    expect(() => verifySessionAccess(session, "valid")).not.toThrow();
    expect(() => verifySessionAccess(session, "invalid")).toThrow(
      "Invalid session credentials",
    );
    expect(() =>
      verifySessionAccess({ ...session, expiresAt: new Date(0) }, "valid"),
    ).toThrow("expired");
  });
});
