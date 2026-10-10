import { APPLICATION } from "@/lib/constants/application";
import {
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_VALUES,
} from "@/lib/config/environment";
import "server-only";
import { z } from "zod";
import crypto from "node:crypto";
import type { VerifiedAuthUser } from "../supabase/server";

import { isDatabaseAllowlistedForTesting } from "@/lib/db/test-db-isolation";

/**
 * Strict security boundary for automated test authentication.
 *
 * Invariants:
 * 1. Must explicitly opt-in: ENABLE_TEST_AUTH === ENVIRONMENT_VALUES.ENABLED
 * 2. Disabled on EVERY Vercel environment (production, preview, development)
 * 3. Fails closed if APP_ENV is production, or if TEST_AUTH_SECRET is missing or < 32 characters
 * 4. Fails closed against unverified remote production databases (must be on explicit test allowlist)
 * 5. Uses HMAC-SHA256 signatures with timing-safe verification
 */
export function isTestAuthPermitted(): boolean {
  // 1. Explicit opt-in flag required
  if (
    readEnvironment(ENVIRONMENT_KEYS.ENABLE_TEST_AUTH) !==
    ENVIRONMENT_VALUES.ENABLED
  ) {
    return false;
  }

  // 2. Prohibited on all Vercel deployment environments
  if (
    readEnvironment(ENVIRONMENT_KEYS.VERCEL) ===
      ENVIRONMENT_VALUES.VERCEL_ENABLED ||
    Boolean(readEnvironment(ENVIRONMENT_KEYS.VERCEL_ENV)) ||
    Boolean(readEnvironment(ENVIRONMENT_KEYS.VERCEL_URL))
  ) {
    return false;
  }

  // 3. Prohibited in production application environments
  const appEnv = (
    readEnvironment(ENVIRONMENT_KEYS.APP_ENV) || ENVIRONMENT_DEFAULTS.EMPTY
  ).toLowerCase();
  if (
    appEnv === ENVIRONMENT_VALUES.PRODUCTION ||
    appEnv === ENVIRONMENT_VALUES.PRODUCTION_ALIAS
  ) {
    return false;
  }

  // 4. Fail closed when TEST_AUTH_SECRET is missing or insufficient length
  const secret = readEnvironment(ENVIRONMENT_KEYS.TEST_AUTH_SECRET);
  if (
    !secret ||
    typeof secret !== "string" ||
    secret.length < APPLICATION.minimumSecretLength
  ) {
    return false;
  }

  // 5. Never allow against unflagged production or databases not in the explicit test allowlist
  if (
    readEnvironment(ENVIRONMENT_KEYS.IS_TEST_DATABASE) !==
    ENVIRONMENT_VALUES.ENABLED
  ) {
    return false;
  }

  const dbUrl =
    readEnvironment(ENVIRONMENT_KEYS.DATABASE_URL) ||
    ENVIRONMENT_DEFAULTS.EMPTY;
  if (!isDatabaseAllowlistedForTesting(dbUrl)) {
    return false;
  }

  return true;
}

export interface TestUserPayload {
  id: string;
  email: string;
  issuedAt: number;
}

const payloadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  issuedAt: z.number().int().positive(),
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Creates a signed, tamper-proof test session token.
 * Returns null if test auth is not strictly permitted.
 */
export function createTestAuthCookie(user: {
  id: string;
  email: string;
}): string | null {
  if (!isTestAuthPermitted()) return null;
  if (!UUID_REGEX.test(user.id)) return null;

  const secret = readEnvironment(ENVIRONMENT_KEYS.TEST_AUTH_SECRET);
  if (!secret) return null;

  const payload: TestUserPayload = {
    id: user.id,
    email: user.email,
    issuedAt: Date.now(),
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verifies a signed test session token with constant-time signature comparison.
 * Returns null on any validation failure, expiration, or disabled state.
 */
export function verifyTestAuthCookie(
  cookieValue: string | undefined,
): VerifiedAuthUser | null {
  if (!cookieValue || !isTestAuthPermitted()) return null;

  const secret = readEnvironment(ENVIRONMENT_KEYS.TEST_AUTH_SECRET);
  if (!secret) return null;

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  if (!data || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expBuffer)
  ) {
    return null;
  }

  try {
    const payload = payloadSchema.parse(
      JSON.parse(Buffer.from(data, "base64url").toString("utf8")),
    );

    if (!payload.id || !UUID_REGEX.test(payload.id)) {
      return null;
    }

    // Tokens expire after 1 hour
    if (
      payload.issuedAt > Date.now() ||
      Date.now() - payload.issuedAt > APPLICATION.testAuthLifetimeSeconds * 1000
    ) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      role: "authenticated",
      claims: {
        sub: payload.id,
        email: payload.email,
        aud: "authenticated",
      },
    };
  } catch {
    return null;
  }
}

export function authenticateTestReviewer(email: string, password: string) {
  if (
    !isTestAuthPermitted() ||
    email !== "reviewer@baskhealth.com" ||
    password !== "ClinicalReview2026!"
  )
    return null;
  const user = { id: "a1111111-1111-4111-8111-111111111111", email };
  const token = createTestAuthCookie(user);
  return token ? { user, token } : null;
}
