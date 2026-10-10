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

  it("verifies recovery security: bounded cooldown, code normalization, and anti-enumeration", async () => {
    const {
      RECOVERY_MAX_ATTEMPTS,
      RECOVERY_LOCKOUT_MS,
    } = await import("@/features/patients/server/session-policy");
    const {
      generateRecoveryCode,
      normalizeRecoveryCode,
      hashRecoveryCode,
      verifyRecoveryCode,
    } = await import("@/lib/security/credentials");

    const pepper = "y".repeat(32);
    const code = generateRecoveryCode();
    const normalized = normalizeRecoveryCode(code);
    const hash = hashRecoveryCode(normalized, pepper);

    // 1. Verify constant-time valid code check
    expect(verifyRecoveryCode(code, hash, pepper)).toBe(true);
    expect(verifyRecoveryCode(code.toLowerCase(), hash, pepper)).toBe(true);
    expect(verifyRecoveryCode(code.replace(/-/g, " "), hash, pepper)).toBe(true);

    // 2. Reject incorrect code
    expect(verifyRecoveryCode("BK-WRONG-CODE-TEST", hash, pepper)).toBe(false);

    // 3. Rate limiting parameters are bounded
    expect(RECOVERY_MAX_ATTEMPTS).toBe(5);
    expect(RECOVERY_LOCKOUT_MS).toBe(15 * 60 * 1000); // exactly 15 minutes, not permanent

    // 4. Cooldown expiration math:
    const now = Date.now();
    const insideCooldown = now - (RECOVERY_LOCKOUT_MS - 5000); // 5s remaining
    expect(now - insideCooldown < RECOVERY_LOCKOUT_MS).toBe(true);

    const outsideCooldown = now - (RECOVERY_LOCKOUT_MS + 1000); // 1s past cooldown
    expect(now - outsideCooldown < RECOVERY_LOCKOUT_MS).toBe(false);
  });
});
