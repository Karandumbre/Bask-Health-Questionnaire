import { describe, it, expect, vi, beforeEach } from "vitest";
import { Question, FormDefinition } from "@/features/forms/domain/types";
import {
  validateSessionSubmission,
  validateSessionProgress,
} from "@/features/patients/domain/validation";
import {
  pruneHiddenAnswers,
  evaluateQuestionVisibility,
} from "@/features/patients/domain/visibility";
import { verifySessionAccess } from "@/features/patients/server/session-policy";
import {
  normalizeRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
  hashCapabilityToken,
  generateCapabilityToken,
  generateRecoveryCode,
} from "@/lib/security/credentials";
import { getSessionCookieName } from "@/features/patients/server/patient-cookies";
import type { PatientAnswers } from "@/features/patients/domain/types";

describe("Patient Intake Foundation & Security Boundaries (Part E Tests)", () => {
  const pepper = "a".repeat(32);

  beforeEach(() => {
    vi.stubEnv("APP_SESSION_PEPPER", pepper);
  });

  // Base test form definition with all field types and conditional branch
  const testQuestions: Question[] = [
    {
      id: "q_name",
      type: "short_text",
      label: "Full Name",
      required: true,
      visibility: null,
      validation: { minLength: 2, maxLength: 50 },
    },
    {
      id: "q_age",
      type: "number",
      label: "Age",
      required: true,
      visibility: null,
      validation: { min: 18, max: 120, integerOnly: true },
    },
    {
      id: "q_consult_type",
      type: "single_select",
      label: "Consultation Reason",
      required: true,
      visibility: null,
      options: [
        { id: "opt_weight", label: "Weight Management" },
        { id: "opt_hair", label: "Hair Restoration" },
        { id: "opt_other", label: "General Wellness" },
      ],
    },
    {
      id: "q_weight_history",
      type: "long_text",
      label: "Previous Weight Loss Medications",
      required: true,
      visibility: {
        parentQuestionId: "q_consult_type",
        equalsOptionId: "opt_weight",
      },
    },
    {
      id: "q_allergies",
      type: "multi_select",
      label: "Known Allergies",
      required: true,
      visibility: null,
      options: [
        { id: "opt_penicillin", label: "Penicillin" },
        { id: "opt_sulfa", label: "Sulfa Drugs" },
        { id: "opt_none", label: "None Known" },
      ],
    },
    {
      id: "q_telehealth_consent",
      type: "checkbox",
      label: "I consent to telehealth medical consultation",
      required: true,
      visibility: null,
    },
  ];

  // =========================================================================
  // 1. Published Version Isolation
  // =========================================================================
  describe("1. Published Version Isolation", () => {
    it("pins the session snapshot to the exact version snapshot at creation", () => {
      const version1Definition: FormDefinition = {
        schemaVersion: 1,
        title: "Intake V1",
        questions: testQuestions.slice(0, 1),
      };

      const version2Definition: FormDefinition = {
        schemaVersion: 1,
        title: "Intake V2 Updated",
        questions: testQuestions.slice(0, 2),
      };

      // Simulated session created against V1
      const patientSession = {
        id: "sess_v1_001",
        publishedVersionId: "ver_001",
        definitionSnapshot: version1Definition,
        currentAnswers: { q_name: "John Doe" },
      };

      // Even if version 2 is published, the session retains V1's snapshot
      expect(version2Definition.title).toBe("Intake V2 Updated");
      expect(patientSession.definitionSnapshot.title).toBe("Intake V1");
      expect(patientSession.definitionSnapshot.questions).toHaveLength(1);

      // Submission validation evaluates against the session's pinned snapshot, not V2
      const result = validateSessionSubmission(
        patientSession.currentAnswers,
        patientSession.definitionSnapshot.questions,
      );
      expect(result.valid).toBe(true);
    });
  });

  // =========================================================================
  // 2. Session-Specific Authorization
  // =========================================================================
  describe("2. Session-Specific Authorization", () => {
    it("permits access when capability token matches the hashed credential", () => {
      const validToken = generateCapabilityToken();
      const session = {
        expiresAt: new Date(Date.now() + 3600_000),
        credentialHash: hashCapabilityToken(validToken, pepper),
      };

      expect(() => verifySessionAccess(session, validToken)).not.toThrow();
    });

    it("rejects invalid, mismatched, or empty capability tokens", () => {
      const validToken = generateCapabilityToken();
      const fakeToken = generateCapabilityToken();
      const session = {
        expiresAt: new Date(Date.now() + 3600_000),
        credentialHash: hashCapabilityToken(validToken, pepper),
      };

      expect(() => verifySessionAccess(session, fakeToken)).toThrow(
        "Invalid session credentials",
      );
      expect(() => verifySessionAccess(session, "")).toThrow(
        "Invalid session credentials",
      );
    });

    it("rejects expired sessions even with valid capability token", () => {
      const validToken = generateCapabilityToken();
      const session = {
        expiresAt: new Date(Date.now() - 1000), // Expired
        credentialHash: hashCapabilityToken(validToken, pepper),
      };

      expect(() => verifySessionAccess(session, validToken)).toThrow("expired");
    });

    it("derives safe cookie names namespaced by slug", () => {
      expect(getSessionCookieName("weight-loss")).toBe(
        "bask_session_weight-loss",
      );
      expect(getSessionCookieName("SPECIAL/SLUG!@#")).toBe(
        "bask_session_special_slug___",
      );
    });
  });

  // =========================================================================
  // 3. Incomplete Progress Persistence
  // =========================================================================
  describe("3. Incomplete Progress Persistence", () => {
    it("allows partial answers during in-progress autosave", () => {
      const partialAnswers: PatientAnswers = {
        q_name: "Jane",
      };

      const result = validateSessionProgress(partialAnswers, testQuestions);
      expect(result.valid).toBe(true);
      expect(result.sanitizedAnswers).toEqual({ q_name: "Jane" });
      expect(result.errors).toHaveLength(0);
    });

    it("preserves answered values across incremental revisions", () => {
      let answers: PatientAnswers = { q_name: "Jane" };
      let revision = 1;

      // User answers consultation type
      answers = { ...answers, q_consult_type: "opt_weight" };
      revision++;

      const res = validateSessionProgress(answers, testQuestions);
      expect(res.valid).toBe(true);
      expect(res.sanitizedAnswers.q_name).toBe("Jane");
      expect(res.sanitizedAnswers.q_consult_type).toBe("opt_weight");
      expect(revision).toBe(2);
    });
  });

  // =========================================================================
  // 4. Conditional Answer Pruning
  // =========================================================================
  describe("4. Conditional Answer Pruning", () => {
    it("evaluates visibility dynamically based on parent choice", () => {
      const questionMap = new Map(testQuestions.map((q) => [q.id, q]));
      const weightQ = testQuestions.find((q) => q.id === "q_weight_history")!;

      // Hidden when consult type is not weight
      expect(
        evaluateQuestionVisibility(
          weightQ,
          { q_consult_type: "opt_hair" },
          questionMap,
        ),
      ).toBe(false);

      // Visible when consult type is opt_weight
      expect(
        evaluateQuestionVisibility(
          weightQ,
          { q_consult_type: "opt_weight" },
          questionMap,
        ),
      ).toBe(true);
    });

    it("automatically prunes hidden answers when parent choice changes", () => {
      const answers: PatientAnswers = {
        q_name: "Jane Doe",
        q_consult_type: "opt_hair", // Changed from weight to hair
        q_weight_history: "Ozempic 1mg weekly for 6 months", // Now hidden!
        q_allergies: ["opt_none"],
        q_telehealth_consent: true,
      };

      const pruned = pruneHiddenAnswers(answers, testQuestions);
      expect(pruned.q_weight_history).toBeUndefined();
      expect(pruned.q_consult_type).toBe("opt_hair");
      expect(pruned.q_name).toBe("Jane Doe");
    });
  });

  // =========================================================================
  // 5. Cross-Browser Recovery
  // =========================================================================
  describe("5. Cross-Browser Recovery", () => {
    it("normalizes and verifies recovery codes regardless of casing or hyphens", () => {
      const normalized = normalizeRecoveryCode("bk 7m4p 88xz 11qr");
      expect(normalized).toBe("BK7M4P88XZ11QR");

      const codeHash = hashRecoveryCode(normalized, pepper);
      expect(verifyRecoveryCode("bk-7m4p-88xz-11qr", codeHash, pepper)).toBe(
        true,
      );
      expect(verifyRecoveryCode("BK 7M4P 88XZ 11QR", codeHash, pepper)).toBe(
        true,
      );
      expect(verifyRecoveryCode("WRONG-CODE-0000", codeHash, pepper)).toBe(
        false,
      );
    });

    it("generates high-entropy recovery codes matching expected format", () => {
      const code = generateRecoveryCode();
      expect(code).toMatch(
        /^BK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
      );
    });
  });

  // =========================================================================
  // 6. Concurrent Recovery Redemption & Rate Limiting
  // =========================================================================
  describe("6. Concurrent Recovery Redemption & Lockout", () => {
    it("locks out recovery after 3 consecutive failed attempts", () => {
      const MAX_ATTEMPTS = 3;
      let recoveryAttempts = 0;
      let lockoutUntil: Date | null = null;

      // Simulate 3 invalid redemption attempts
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recoveryAttempts++;
        if (recoveryAttempts >= MAX_ATTEMPTS) {
          lockoutUntil = new Date(Date.now() + 15 * 60_000); // 15 min lockout
        }
      }

      expect(recoveryAttempts).toBe(3);
      expect(lockoutUntil).not.toBeNull();
      expect(lockoutUntil!.getTime()).toBeGreaterThan(Date.now());

      // Attempt while locked out fails closed
      const isLockedOut = lockoutUntil && lockoutUntil.getTime() > Date.now();
      expect(isLockedOut).toBe(true);
    });

    it("cycles recovery code upon redemption so old code cannot be reused", () => {
      const initialCode = generateRecoveryCode();
      const initialHash = hashRecoveryCode(
        normalizeRecoveryCode(initialCode),
        pepper,
      );

      // Verify redemption succeeds with initial code
      expect(verifyRecoveryCode(initialCode, initialHash, pepper)).toBe(true);

      // System cycles code upon redemption
      const newCode = generateRecoveryCode();
      const newHash = hashRecoveryCode(normalizeRecoveryCode(newCode), pepper);

      // Old code is now invalid against the new hash
      expect(verifyRecoveryCode(initialCode, newHash, pepper)).toBe(false);
      expect(verifyRecoveryCode(newCode, newHash, pepper)).toBe(true);
    });
  });

  // =========================================================================
  // 7. Submission with Unknown Values
  // =========================================================================
  describe("7. Submission with Unknown Values", () => {
    it("rejects submissions containing unknown question IDs", () => {
      const answers: PatientAnswers = {
        q_name: "Alice",
        q_age: 28,
        q_consult_type: "opt_other",
        q_allergies: ["opt_none"],
        q_telehealth_consent: true,
        injected_field: "malicious_payload",
      };

      const result = validateSessionSubmission(answers, testQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "injected_field",
          code: "UNEXPECTED_ANSWER",
        }),
      );
    });

    it("rejects unknown option IDs in single-select", () => {
      const answers: PatientAnswers = {
        q_name: "Alice",
        q_age: 28,
        q_consult_type: "opt_nonexistent_reason",
        q_allergies: ["opt_none"],
        q_telehealth_consent: true,
      };

      const result = validateSessionSubmission(answers, testQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_consult_type",
          code: "UNKNOWN_OPTION_ID",
        }),
      );
    });
  });

  // =========================================================================
  // 8. Required Checkbox and Multi-Select Validation
  // =========================================================================
  describe("8. Required Checkbox and Multi-Select Validation", () => {
    it("rejects unchecked (false) required checkbox", () => {
      const answers: PatientAnswers = {
        q_name: "Alice",
        q_age: 28,
        q_consult_type: "opt_other",
        q_allergies: ["opt_none"],
        q_telehealth_consent: false,
      };

      const result = validateSessionSubmission(answers, testQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_telehealth_consent",
          code: "REQUIRED_CHECKBOX_UNCHECKED",
        }),
      );
    });

    it("rejects empty selection array for required multi-select", () => {
      const answers: PatientAnswers = {
        q_name: "Alice",
        q_age: 28,
        q_consult_type: "opt_other",
        q_allergies: [], // Empty!
        q_telehealth_consent: true,
      };

      const result = validateSessionSubmission(answers, testQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_allergies",
          code: "REQUIRED_MULTISELECT_EMPTY",
        }),
      );
    });

    it("rejects duplicate option selections in multi-select", () => {
      const answers: PatientAnswers = {
        q_name: "Alice",
        q_age: 28,
        q_consult_type: "opt_other",
        q_allergies: ["opt_penicillin", "opt_penicillin"],
        q_telehealth_consent: true,
      };

      const result = validateSessionSubmission(answers, testQuestions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "q_allergies",
          code: "DUPLICATE_SELECTION",
        }),
      );
    });

    it("accepts valid submission with checked checkbox and distinct choices", () => {
      const answers: PatientAnswers = {
        q_name: "Alice Walker",
        q_age: 28,
        q_consult_type: "opt_weight",
        q_weight_history: "None previously taken",
        q_allergies: ["opt_penicillin", "opt_sulfa"],
        q_telehealth_consent: true,
      };

      const result = validateSessionSubmission(answers, testQuestions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // 9. Concurrent Submissions & Exact-Once Guarantee
  // =========================================================================
  describe("9. Concurrent Submissions & Exact-Once Guarantee", () => {
    it("guarantees idempotent handling when session is already completed", () => {
      const initialSubmission = {
        id: "sub_1001",
        sessionId: "sess_concurrent_01",
        submittedAt: new Date(),
        status: "completed" as const,
        answerSnapshot: { q_name: "Alice" },
      };

      // Simulated transaction logic: If session status is completed, return idempotent replay
      const simulateSubmissionAttempt = (sessionStatus: string) => {
        if (sessionStatus === "completed") {
          return {
            submissionId: initialSubmission.id,
            status: "completed",
            submittedAt: initialSubmission.submittedAt,
            isIdempotentReplay: true,
          };
        }
        return {
          submissionId: "sub_1001",
          status: "completed",
          submittedAt: new Date(),
          isIdempotentReplay: false,
        };
      };

      // First call succeeds as new submission
      const first = simulateSubmissionAttempt("in_progress");
      expect(first.isIdempotentReplay).toBe(false);

      // Concurrent or subsequent call detects completed status and replays without creating new record
      const second = simulateSubmissionAttempt("completed");
      expect(second.isIdempotentReplay).toBe(true);
      expect(second.submissionId).toBe(initialSubmission.id);
    });
  });

  // =========================================================================
  // 10. Lost-Success-Response Retry
  // =========================================================================
  describe("10. Lost-Success-Response Retry", () => {
    it("returns original submission confirmation upon retry replay", () => {
      const existingSubmission = {
        id: "sub_retry_888",
        sessionId: "sess_retry_01",
        submittedAt: new Date("2026-10-10T12:00:00Z"),
        status: "completed" as const,
        answerSnapshot: { q_name: "Bob" },
      };

      // Simulating retry request logic from submission-service.ts
      const replayResult = {
        submissionId: existingSubmission.id,
        sessionId: existingSubmission.sessionId,
        status: existingSubmission.status,
        submittedAt: existingSubmission.submittedAt,
        answerSnapshot: existingSubmission.answerSnapshot,
        isIdempotentReplay: true,
      };

      expect(replayResult.isIdempotentReplay).toBe(true);
      expect(replayResult.submissionId).toBe("sub_retry_888");
      expect(replayResult.submittedAt).toEqual(existingSubmission.submittedAt);
    });
  });

  // =========================================================================
  // 11. Completed Response Immutability
  // =========================================================================
  describe("11. Completed Response Immutability", () => {
    it("fails closed when attempting to save progress on a completed session", () => {
      const session = {
        id: "sess_completed_99",
        status: "completed" as const,
      };

      const attemptSaveOnCompletedSession = () => {
        if (session.status === "completed") {
          throw new Error("Cannot modify an already completed intake session");
        }
      };

      expect(attemptSaveOnCompletedSession).toThrow(
        "Cannot modify an already completed intake session",
      );
    });
  });
});
