import "server-only";
import { type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

/**
 * Validates request origin against the host header for state-mutating HTTP requests.
 * Enforces SEC-03 (CSRF & Origin Verification) on all mutating Route Handlers.
 */
export function verifyRequestOrigin(request: NextRequest): void {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // In Next.js server environment, requests from standard browsers include origin or host
  if (!origin || !host) {
    // Allow non-browser server-to-server or test requests if origin is omitted,
    // but reject if origin is explicitly provided and mismatched.
    if (!origin) return;
    throw new AppError(
      "FORBIDDEN",
      "Cross-site mutation rejected: Missing host header.",
      403,
    );
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      throw new AppError(
        "FORBIDDEN",
        `Cross-site mutation rejected: Origin '${originUrl.host}' does not match host '${host}'.`,
        403,
      );
    }
  } catch {
    throw new AppError(
      "FORBIDDEN",
      "Cross-site mutation rejected: Malformed origin header.",
      403,
    );
  }
}
