import "server-only";
import { AppError } from "@/lib/errors";
import { verifyCapabilityToken } from "@/lib/security/credentials";

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const RECOVERY_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const RECOVERY_MAX_ATTEMPTS = 5;
export const RECOVERY_LOCKOUT_MS = 15 * 60 * 1000;

export function getSessionPepper(): string {
  const pepper = process.env.APP_SESSION_PEPPER;
  if (!pepper || pepper.length < 32)
    throw new Error("APP_SESSION_PEPPER must contain at least 32 characters.");
  return pepper;
}

export function verifySessionAccess(
  session: { expiresAt: Date; credentialHash: string },
  token: string,
): void {
  if (
    !verifyCapabilityToken(token, session.credentialHash, getSessionPepper())
  ) {
    throw AppError.sessionUnauthorized("Invalid session credentials.");
  }
  if (Date.now() >= session.expiresAt.getTime()) {
    throw new AppError("SESSION_EXPIRED", "Intake session has expired.", 410);
  }
}
