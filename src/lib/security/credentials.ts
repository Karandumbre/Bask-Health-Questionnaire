import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "crypto";

const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 32 characters, no I, L, O, U

/**
 * Generates a public non-secret session reference (e.g., BKS-9A4F-71KQ).
 */
export function generateSessionReference(): string {
  const bytes = randomBytes(4);
  const part1 = bytes
    .readUInt16BE(0)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  const part2 = bytes
    .readUInt16BE(2)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `BKS-${part1}-${part2}`;
}

/**
 * Generates a high-entropy patient recovery code (e.g., BK-9X4M-77QP-W2NZ-58JK).
 * 16 base-32 characters = 80 bits of cryptographic entropy.
 */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(16);
  let raw = "";
  for (let i = 0; i < 16; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      raw += CROCKFORD_ALPHABET[byte % 32];
    }
  }
  return `BK-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/**
 * Normalizes a user-entered recovery code for lookup:
 * Strips whitespace and dashes, converts to uppercase.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/**
 * Computes the HMAC-SHA256 digest of a normalized recovery code.
 */
export function hashRecoveryCode(
  normalizedCode: string,
  pepper: string,
): string {
  return createHmac("sha256", pepper).update(normalizedCode).digest("hex");
}

/**
 * Constant-time comparison between an incoming recovery code and the stored hash.
 */
export function verifyRecoveryCode(
  incomingCode: string,
  storedHash: string,
  pepper: string,
): boolean {
  const normalized = normalizeRecoveryCode(incomingCode);
  const computedHash = hashRecoveryCode(normalized, pepper);
  const bufA = Buffer.from(computedHash, "hex");
  const bufB = Buffer.from(storedHash, "hex");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Generates a 32-byte cryptographically secure capability token for the HttpOnly session cookie.
 */
export function generateCapabilityToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Computes the HMAC-SHA256 digest of a session capability token.
 */
export function hashCapabilityToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(token).digest("hex");
}

/**
 * Constant-time comparison between an incoming capability token and the stored hash.
 */
export function verifyCapabilityToken(
  incomingToken: string,
  storedHash: string,
  pepper: string,
): boolean {
  const computedHash = hashCapabilityToken(incomingToken, pepper);
  const bufA = Buffer.from(computedHash, "hex");
  const bufB = Buffer.from(storedHash, "hex");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Encrypts replacement credentials for safe bounded retryability upon network drops.
 * Uses AES-256-GCM authenticated encryption.
 */
export function encryptRecoveryReplay(
  payload: { newRecoveryCode: string; newCapabilityToken: string },
  pepper: string,
): string {
  const key = createHash("sha256").update(pepper).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const jsonStr = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(jsonStr, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts replacement credentials if within the valid replay window.
 */
export function decryptRecoveryReplay(
  cipherPayload: string,
  pepper: string,
): { newRecoveryCode: string; newCapabilityToken: string } | null {
  try {
    const parts = cipherPayload.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, tagHex, encryptedHex] = parts;
    if (!ivHex || !tagHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key = createHash("sha256").update(pepper).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const parsed = JSON.parse(decrypted.toString("utf8"));
    if (
      typeof parsed?.newRecoveryCode === "string" &&
      typeof parsed?.newCapabilityToken === "string"
    ) {
      return {
        newRecoveryCode: parsed.newRecoveryCode,
        newCapabilityToken: parsed.newCapabilityToken,
      };
    }
    return null;
  } catch {
    return null;
  }
}
