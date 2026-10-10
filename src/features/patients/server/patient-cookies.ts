import { getRuntimeConfig, ENVIRONMENT_VALUES } from "@/lib/config/environment";
import "server-only";
import { AppError, ErrorCode } from "@/lib/errors";
import type { NextResponse } from "next/server";

export function getSessionCookieName(publicSlug: string): string {
  const sanitized = publicSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `bask_session_${sanitized}`;
}

export function parseSessionCookie(
  cookieValue: string | undefined,
): { sessionId: string; capabilityToken: string } | null {
  if (!cookieValue) return null;
  const delimiterIndex = cookieValue.indexOf(":");
  if (delimiterIndex <= 0 || delimiterIndex >= cookieValue.length - 1) {
    return null;
  }
  const sessionId = cookieValue.slice(0, delimiterIndex);
  const capabilityToken = cookieValue.slice(delimiterIndex + 1);
  return { sessionId, capabilityToken };
}

export function setSessionCapabilityCookie(
  response: NextResponse,
  publicSlug: string,
  sessionId: string,
  capabilityToken: string,
): void {
  const cookieName = getSessionCookieName(publicSlug);
  const cookieValue = `${sessionId}:${capabilityToken}`;
  const runtime = getRuntimeConfig();
  const isProduction =
    runtime.isProduction ||
    runtime.appEnv === ENVIRONMENT_VALUES.PRODUCTION ||
    runtime.vercelEnv === ENVIRONMENT_VALUES.PRODUCTION;

  response.cookies.set({
    name: cookieName,
    value: cookieValue,
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function clearSessionCapabilityCookie(
  response: NextResponse,
  publicSlug: string,
): void {
  const cookieName = getSessionCookieName(publicSlug);
  response.cookies.delete(cookieName);
}

export function isSessionAccessError(error: unknown): error is AppError {
  return (
    error instanceof AppError &&
    (error.code === ErrorCode.SESSION_EXPIRED ||
      error.code === ErrorCode.SESSION_UNAUTHORIZED)
  );
}
