import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  generateSessionReference,
  normalizeRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/security/credentials";

describe("Patient Credentials & Cryptographic Recovery", () => {
  const TEST_PEPPER = "test-session-pepper-secret-32-bytes";

  it("generates correctly formatted session references", () => {
    const ref = generateSessionReference();
    expect(ref).toMatch(/^BKS-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("generates high-entropy recovery codes matching Crockford base-32 format", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^BK-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    // Disallows ambiguous characters like 'O', 'I', 'L'
    expect(code).not.toContain("O");
    expect(code).not.toContain("I");
  });

  it("normalizes user inputs cleanly regardless of whitespace or casing", () => {
    const raw = " bk - 9x4m - 77qp - w2nz - 58jk ";
    const normalized = normalizeRecoveryCode(raw);
    expect(normalized).toBe("BK9X4M77QPW2NZ58JK");
  });

  it("verifies matching recovery code successfully", () => {
    const code = generateRecoveryCode();
    const normalized = normalizeRecoveryCode(code);
    const hash = hashRecoveryCode(normalized, TEST_PEPPER);

    // Exact match
    expect(verifyRecoveryCode(code, hash, TEST_PEPPER)).toBe(true);

    // Match with lowercase and arbitrary spaces
    const looseInput = code.toLowerCase().replace(/-/g, " ");
    expect(verifyRecoveryCode(looseInput, hash, TEST_PEPPER)).toBe(true);
  });

  it("rejects invalid or tampered recovery codes", () => {
    const code = generateRecoveryCode();
    const normalized = normalizeRecoveryCode(code);
    const hash = hashRecoveryCode(normalized, TEST_PEPPER);

    const tamperedCode = code.slice(0, -1) + (code.endsWith("Z") ? "Y" : "Z");
    expect(verifyRecoveryCode(tamperedCode, hash, TEST_PEPPER)).toBe(false);
  });

  it("rejects verification when using wrong pepper", () => {
    const code = generateRecoveryCode();
    const normalized = normalizeRecoveryCode(code);
    const hash = hashRecoveryCode(normalized, TEST_PEPPER);

    expect(verifyRecoveryCode(code, hash, "different-pepper")).toBe(false);
  });
});

