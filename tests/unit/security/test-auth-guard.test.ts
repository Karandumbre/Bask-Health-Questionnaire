import {
  ENVIRONMENT_KEYS,
  ENVIRONMENT_NAMES,
  ENVIRONMENT_VALUES,
} from "../../../config/environment.mjs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isTestAuthPermitted,
  createTestAuthCookie,
  verifyTestAuthCookie,
} from "@/lib/auth/test-auth-guard";

describe("Test Auth Guard — Fail-Closed Security Boundary", () => {
  const originalEnv = { ...process.env };
  const validSecret =
    "a_super_secret_test_auth_key_with_at_least_32_characters_12345";
  const validUserId = "a1111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]];
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]];
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL]];
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_ENV]];
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_URL]];
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.APP_ENV]];
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.IS_TEST_DATABASE]];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails closed when ENABLE_TEST_AUTH is missing or false", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;
    expect(isTestAuthPermitted()).toBe(false);

    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.DISABLED;
    expect(isTestAuthPermitted()).toBe(false);

    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.DISABLED_NUMERIC;
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed on ANY Vercel deployment environment", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;

    // Vercel system flag
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL]] =
      ENVIRONMENT_VALUES.VERCEL_ENABLED;
    expect(isTestAuthPermitted()).toBe(false);
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL]];

    // Vercel preview environment
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_ENV]] =
      ENVIRONMENT_VALUES.PREVIEW;
    expect(isTestAuthPermitted()).toBe(false);

    // Vercel production environment
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_ENV]] =
      ENVIRONMENT_VALUES.PRODUCTION;
    expect(isTestAuthPermitted()).toBe(false);

    // Vercel development environment
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_ENV]] =
      ENVIRONMENT_VALUES.DEVELOPMENT;
    expect(isTestAuthPermitted()).toBe(false);
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_ENV]];

    // Vercel deployment URL present
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.VERCEL_URL]] =
      "intake-studio-preview.vercel.app";
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed when APP_ENV is production", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.APP_ENV]] =
      ENVIRONMENT_VALUES.PRODUCTION;
    expect(isTestAuthPermitted()).toBe(false);

    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.APP_ENV]] =
      ENVIRONMENT_VALUES.PRODUCTION_ALIAS;
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed when TEST_AUTH_SECRET is missing or insufficient length", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;

    // Missing secret
    delete process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]];
    expect(isTestAuthPermitted()).toBe(false);

    // Secret too short (< 32 chars)
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      "short_secret_12345";
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed against unverified remote databases", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.DATABASE_URL]] =
      "postgres://postgres:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

    // Without IS_TEST_DATABASE=true
    expect(isTestAuthPermitted()).toBe(false);

    // With explicit IS_TEST_DATABASE=true
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.IS_TEST_DATABASE]] =
      ENVIRONMENT_VALUES.ENABLED;
    expect(isTestAuthPermitted()).toBe(true);
  });

  it("rejects token generation when test auth is not permitted or ID is invalid", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.DISABLED;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;

    // Not permitted
    expect(
      createTestAuthCookie({ id: validUserId, email: "test@example.com" }),
    ).toBeNull();

    // Permitted, but invalid non-UUID format
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;
    expect(
      createTestAuthCookie({
        id: "invalid-user-id",
        email: "test@example.com",
      }),
    ).toBeNull();
  });

  it("rejects tokens with tampered data or invalid signatures", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.IS_TEST_DATABASE]] =
      ENVIRONMENT_VALUES.ENABLED;

    const validToken = createTestAuthCookie({
      id: validUserId,
      email: "reviewer@baskhealth.com",
    });
    expect(validToken).not.toBeNull();

    // Tampered payload data
    const [data, sig] = validToken!.split(".");
    const tamperedData = Buffer.from(
      JSON.stringify({
        id: "b2222222-2222-4222-8222-222222222222",
        email: "attacker@evil.com",
        issuedAt: Date.now(),
      }),
    ).toString("base64url");
    expect(verifyTestAuthCookie(`${tamperedData}.${sig}`)).toBeNull();

    // Tampered signature
    expect(verifyTestAuthCookie(`${data}.invalid_sig_here`)).toBeNull();

    // Malformed token format
    expect(verifyTestAuthCookie("malformed-token-string")).toBeNull();
    expect(verifyTestAuthCookie("")).toBeNull();
    expect(verifyTestAuthCookie(undefined)).toBeNull();
  });

  it("successfully signs and verifies valid test credentials within maxAge", () => {
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.ENABLE_TEST_AUTH]] =
      ENVIRONMENT_VALUES.ENABLED;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.TEST_AUTH_SECRET]] =
      validSecret;
    process.env[ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.IS_TEST_DATABASE]] =
      ENVIRONMENT_VALUES.ENABLED;

    const token = createTestAuthCookie({
      id: validUserId,
      email: "reviewer@baskhealth.com",
    });
    expect(token).not.toBeNull();

    const user = verifyTestAuthCookie(token!);
    expect(user).not.toBeNull();
    expect(user?.id).toBe(validUserId);
    expect(user?.email).toBe("reviewer@baskhealth.com");
    expect(user?.role).toBe("authenticated");
    expect(user?.claims.sub).toBe(validUserId);
  });
});
