# Threat Model & Security Architecture

This document evaluates the threat landscape for **Intake Studio** using the **STRIDE** methodology, establishing explicit mitigation strategies for clinical data security.

---

## 1. System Trust Boundaries

```
[ UNTRUSTED INTERNET ]
        │
        ▼ (HTTPS / TLS 1.3)
┌─────────────────────────────────────────────────────────────┐
│ Edge / Next.js Reverse Proxy (Vercel)                       │
│ - Strict CSP headers, Referrer-Policy: strict-origin        │
│ - Cache-Control: no-store, private on all clinical routes   │
└───────────────────────┬─────────────────────────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Admin Plane                  │  │ Patient Plane                │
│ - Supabase Auth Cookie (JWT) │  │ - Ephemeral Capability Cookie│
│ - Workspace Guard Middleware │  │ - One-Time Recovery Proof    │
│ - Role: Owner / Editor       │  │ - Pinned Version Scope Only  │
└──────────────┬───────────────┘  └──────────────┬───────────────┘
               │                                 │
               └────────────────┬────────────────┘
                                │ (Server-Only Pooled TLS Connection)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Database (Supabase)                              │
│ - DB Triggers (FORBID UPDATE/DELETE on snapshots & results) │
│ - Cryptographic Hashes (HMAC-SHA256 for recovery codes)     │
│ - Row-level Locking (SELECT FOR UPDATE on submit)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. STRIDE Threat Analysis

| Threat Category            | Threat Scenario                                                                                                | Impact                                                      | Mitigation Strategy                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | Attacker impersonates a clinical administrator to modify intake drafts.                                        | Unauthorized modification of medical intake questions.      | **M-1:** Administrative routes require authenticated Supabase Auth JWT. Every API handler verifies workspace membership in `admin_memberships` table.                                                                             |
| **Spoofing**               | Attacker guesses a patient's session ID to access or alter their intake progress.                              | Unauthorized access to patient answers.                     | **M-2:** `session_reference` is a public lookup identifier only. Access requires an ephemeral `HttpOnly; SameSite=Strict; Secure` capability cookie OR cryptographic proof of a high-entropy recovery code (`BK-XXXX-XXXX-XXXX`). |
| **Tampering**              | Administrator modifies a published intake form to alter questions after patients submitted answers.            | Fraudulent clinical records; corrupted audit trail.         | **M-3:** Published versions are stored in `published_versions` with a PostgreSQL trigger raising exceptions on any `UPDATE` or `DELETE`.                                                                                          |
| **Tampering**              | Patient uses DevTools to submit answers to hidden questions or bypass validation limits.                       | Corrupted or malicious data injected into clinical records. | **M-4:** The server recalculates conditional visibility from scratch against the pinned version snapshot, automatically pruning hidden fields and rejecting unlisted choices.                                                     |
| **Repudiation**            | An editor claims they did not delete or archive a critical clinical form.                                      | Lack of accountability.                                     | **M-5:** `audit_events` logs every administrative action with actor user ID, workspace ID, timestamp, and action type (excluding sensitive clinical payloads).                                                                    |
| **Information Disclosure** | Patient answers or session secrets leak through URLs into browser history, analytics, or HTTP Referer headers. | Patient Health Information (PHI) compromise.                | **M-6:** Form answers and recovery tokens are NEVER passed via URL parameters. `Referrer-Policy: strict-origin-when-cross-origin` and `Cache-Control: private, no-store` are enforced on all clinical endpoints.                  |
| **Information Disclosure** | Verbose server error messages leak SQL table schemas or database connection strings.                           | Reconnaissance vector for attackers.                        | **M-7:** Standardized error envelopes with generic error codes (`INTERNAL_ERROR`, `INVALID_ANSWER`). Database exceptions and stack traces are swallowed before reaching HTTP responses.                                           |
| **Denial of Service**      | Attacker brute-forces the 16-character patient recovery code to hijack a session.                              | Session takeover or resource exhaustion.                    | **M-8:** Recovery code verification is rate-limited via database counters (`recovery_attempts_count` capped at 3 failed attempts per 15-minute window in `session-policy.ts`).                                                    |
| **Elevation of Privilege** | Editor belonging to Workspace A accesses or edits drafts belonging to Workspace B (IDOR).                      | Cross-tenant data breach.                                   | **M-9:** All database operations strictly join against the caller's verified `workspace_id`. Direct lookups by raw UUID without tenant scoping are strictly prohibited.                                                           |

---

## 3. Cryptographic Storage of Patient Recovery Credentials

1. **Recovery Code Generation:**
   - Format: `BK-[4 chars]-[4 chars]-[4 chars]-[4 chars]` using Crockford Base-32 alphabet (excluding ambiguous characters `0, O, 1, I, L`).
   - Entropy: 16 characters $\times 5\text{ bits} = 80\text{ bits}$ of cryptographic entropy (generated via `crypto.randomBytes`).

2. **Server-Side Storage:**
   - The plaintext recovery code is displayed **once** in the initial JSON response and is NEVER stored in the database.
   - The database stores:
     $$\text{recovery\_hash} = \text{HMAC-SHA256}(\text{recovery\_code}, \text{APP\_SESSION\_PEPPER})$$
   - Verification uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

3. **Rotation Upon Redemption & Encrypted Replay Grace Window:**
   - When a patient resumes on another device, the verified recovery code is immediately rotated inside a `SELECT ... FOR UPDATE` transaction, and a fresh recovery code + capability cookie are issued.
   - To tolerate transient network drops during recovery redemption without re-exposing plaintext tokens, `recovery_replay_payload` is encrypted with `AES-256-GCM` (keyed from `APP_SESSION_PEPPER` with a random 96-bit IV and 128-bit auth tag) and honored only within a 60-second grace window (`previous_recovery_rotated_at`).

---

## 4. Privacy & Logging Safeguards

- **Zero Clinical Logging:** Application logs (`console.log`, route error handlers, telemetry) never record request bodies containing patient answers, recovery codes, or capability cookie values (`src/lib/errors/route-handler.ts`).
- **Audit Logs Contain Metadata Only:** `audit_events` stores entity IDs, timestamps, user IDs, and high-level actions (`form.published`, `draft.saved`), never question definitions or patient answers.

---

## 5. Transport & At-Rest Encryption Guarantees

1. **HTTPS Everywhere (In Transit — Browser to Edge):**
   - Deployed behind Vercel's edge network enforcing HTTPS with TLS 1.3, HSTS, `SameSite=Strict; Secure; HttpOnly` cookies, `Referrer-Policy: strict-origin-when-cross-origin`, and `Cache-Control: private, no-store` on all session and response endpoints.
2. **Encrypted Database Connections (In Transit — Server to PostgreSQL):**
   - Server-only `postgres.js` connections (`DATABASE_URL` via Supavisor port 6543 and `DATABASE_DIRECT_URL` via port 5432) connect over TLS-encrypted channels to hosted Supabase PostgreSQL.
3. **Provider-Managed Encryption at Rest:**
   - Hosted Supabase PostgreSQL encrypts all underlying storage volumes, WAL segments, and automated backups at rest using AWS KMS-managed AES-256 block encryption.
   - Within the database, capability tokens and recovery codes are keyed-hashed via `HMAC-SHA256`, and transient recovery replay payloads are encrypted at the application layer with `AES-256-GCM`.

---

## 6. What Would Change Before Handling Real Patient Data (PHI / HIPAA Readiness)

While this application uses synthetic data only and custom field-level encryption / formal HIPAA certification are outside assessment scope, transitioning to real Protected Health Information (PHI) requires the following architectural upgrades:

1. **Encryption Choices (Application-Layer Envelope Encryption):**
   - **Current:** Relies on provider-managed disk encryption at rest (AES-256) for `patient_sessions.answer_json` and `submissions.answer_snapshot`.
   - **Production PHI Change:** Implement application-layer **envelope encryption (`AES-256-GCM`)** on `answer_json` and `answer_snapshot` before writing to PostgreSQL. Each submission or patient session receives a unique Data Encryption Key (DEK), and only ciphertext + authenticated metadata (workspace ID, form ID, version ID, session ID as Additional Authenticated Data / AAD) is stored in PostgreSQL. If specific clinical fields require server-side filtering, compute deterministic **HMAC blind indexes** with a separate key rather than storing cleartext JSONB.
2. **Key Management & Rotation:**
   - **Current:** Uses a single server-only environment secret (`APP_SESSION_PEPPER`, $\ge 32$ bytes) stored in Vercel encrypted environment variables.
   - **Production PHI Change:** Integrate a dedicated FIPS 140-3 Level 3 Hardware Security Module / Key Management Service (**AWS KMS** or **GCP Cloud KMS**) to wrap and unwrap per-record or per-workspace DEKs using a Customer Master Key (CMK/KEK). Enforce automated annual KEK rotation, store key version IDs alongside ciphertext records for zero-downtime re-wrapping, and separate IAM roles so database administrators cannot decrypt DEKs and KMS administrators cannot query PostgreSQL.
3. **Access Auditing (PHI Read & Write Trails):**
   - **Current:** `audit_events` records administrative write lifecycle events (`form.created`, `draft.saved`, `form.published`, `form.archived`).
   - **Production PHI Change:** HIPAA Security Rule (§ 164.312(b)) mandates auditing **every read, view, export, and modification of PHI**. Augment `response-service.ts` (`listFormSubmissions`, `getSubmissionDetail`) to emit synchronous, tamper-evident audit records (`submission.viewed`, `submission.listed`) capturing `actor_user_id`, `workspace_id`, `submission_id`, source IP, user agent, and access purpose, streamed to an append-only, WORM-compliant log sink (e.g., AWS CloudWatch Logs / S3 Object Lock) alongside signed **Business Associate Agreements (BAAs)** with Vercel and Supabase (Enterprise/HIPAA tiers).
4. **Data Retention & Secure Disposal:**
   - **Current:** `ON DELETE RESTRICT` and PostgreSQL immutability triggers (`trg_protect_submissions`) prevent accidental or unauthorized deletion of submitted responses; abandoned sessions expire logically via `expires_at`.
   - **Production PHI Change:** Implement automated lifecycle workers and policy-governed retention schedules:
     - **Abandoned Sessions:** Scheduled pg_cron / worker job to hard-purge unsubmitted `in_progress` `patient_sessions` whose `expires_at` has passed (e.g., $> 30$ days), minimizing stagnant PHI exposure.
     - **Submitted Records & Crypto-Shredding:** Retain completed clinical submissions for the statutory period (typically 6–7 years under HIPAA / state medical record laws) in cold archival storage, and support legally verified patient deletion / right-to-erasure requests via **cryptographic erasure** (destroying the specific record's wrapped DEK and archiving a signed destruction certificate in `audit_events`).
