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
    delete process.env.ENABLE_TEST_AUTH;
    delete process.env.TEST_AUTH_SECRET;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.APP_ENV;
    delete process.env.IS_TEST_DATABASE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails closed when ENABLE_TEST_AUTH is missing or false", () => {
    process.env.TEST_AUTH_SECRET = validSecret;
    expect(isTestAuthPermitted()).toBe(false);

    process.env.ENABLE_TEST_AUTH = "false";
    expect(isTestAuthPermitted()).toBe(false);

    process.env.ENABLE_TEST_AUTH = "0";
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed on ANY Vercel deployment environment", () => {
    process.env.ENABLE_TEST_AUTH = "true";
    process.env.TEST_AUTH_SECRET = validSecret;

    // Vercel system flag
    process.env.VERCEL = "1";
    expect(isTestAuthPermitted()).toBe(false);
    delete process.env.VERCEL;

    // Vercel preview environment
    process.env.VERCEL_ENV = "preview";
    expect(isTestAuthPermitted()).toBe(false);

    // Vercel production environment
    process.env.VERCEL_ENV = "production";
    expect(isTestAuthPermitted()).toBe(false);

    // Vercel development environment
    process.env.VERCEL_ENV = "development";
    expect(isTestAuthPermitted()).toBe(false);
    delete process.env.VERCEL_ENV;

    // Vercel deployment URL present
    process.env.VERCEL_URL = "intake-studio-preview.vercel.app";
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed when APP_ENV is production", () => {
    process.env.ENABLE_TEST_AUTH = "true";
    process.env.TEST_AUTH_SECRET = validSecret;
    process.env.APP_ENV = "production";
    expect(isTestAuthPermitted()).toBe(false);

    process.env.APP_ENV = "prod";
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed when TEST_AUTH_SECRET is missing or insufficient length", () => {
    process.env.ENABLE_TEST_AUTH = "true";

    // Missing secret
    delete process.env.TEST_AUTH_SECRET;
    expect(isTestAuthPermitted()).toBe(false);

    // Secret too short (< 32 chars)
    process.env.TEST_AUTH_SECRET = "short_secret_12345";
    expect(isTestAuthPermitted()).toBe(false);
  });

  it("fails closed against unverified remote databases", () => {
    process.env.ENABLE_TEST_AUTH = "true";
    process.env.TEST_AUTH_SECRET = validSecret;
    process.env.DATABASE_URL =
      "postgres://postgres:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

    // Without IS_TEST_DATABASE=true
    expect(isTestAuthPermitted()).toBe(false);

    // With explicit IS_TEST_DATABASE=true
    process.env.IS_TEST_DATABASE = "true";
    expect(isTestAuthPermitted()).toBe(true);
  });

  it("rejects token generation when test auth is not permitted or ID is invalid", () => {
    process.env.ENABLE_TEST_AUTH = "false";
    process.env.TEST_AUTH_SECRET = validSecret;

    // Not permitted
    expect(
      createTestAuthCookie({ id: validUserId, email: "test@example.com" }),
    ).toBeNull();

    // Permitted, but invalid non-UUID format
    process.env.ENABLE_TEST_AUTH = "true";
    expect(
      createTestAuthCookie({
        id: "invalid-user-id",
        email: "test@example.com",
      }),
    ).toBeNull();
  });

  it("rejects tokens with tampered data or invalid signatures", () => {
    process.env.ENABLE_TEST_AUTH = "true";
    process.env.TEST_AUTH_SECRET = validSecret;
    process.env.IS_TEST_DATABASE = "true";

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
    process.env.ENABLE_TEST_AUTH = "true";
    process.env.TEST_AUTH_SECRET = validSecret;
    process.env.IS_TEST_DATABASE = "true";

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
