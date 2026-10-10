import { APPLICATION } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";
import { readEnvironment, ENVIRONMENT_KEYS } from "@/lib/config/environment";
import "server-only";
import { AppError } from "@/lib/errors";
import { verifyCapabilityToken } from "@/lib/security/credentials";

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const RECOVERY_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const RECOVERY_MAX_ATTEMPTS = 5;
export const RECOVERY_LOCKOUT_MS = 15 * 60 * 1000;

export function getSessionPepper(): string {
  const pepper = readEnvironment(ENVIRONMENT_KEYS.SESSION_PEPPER);
  if (!pepper || pepper.length < APPLICATION.minimumSecretLength)
    throw new Error(
      APP_MESSAGES.APP_SESSION_PEPPER_MUST_CONTAIN_AT_LEAST_32_CHARACTERS,
    );
  return pepper;
}

export function verifySessionAccess(
  session: { expiresAt: Date; credentialHash: string },
  token: string,
): void {
  if (
    !verifyCapabilityToken(token, session.credentialHash, getSessionPepper())
  ) {
    throw AppError.sessionUnauthorized(
      APP_MESSAGES.INVALID_SESSION_CREDENTIALS,
    );
  }
  if (Date.now() >= session.expiresAt.getTime()) {
    throw new AppError(
      "SESSION_EXPIRED",
      APP_MESSAGES.INTAKE_SESSION_HAS_EXPIRED,
      410,
    );
  }
}
