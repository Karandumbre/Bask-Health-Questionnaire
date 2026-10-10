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

| Threat Category | Threat Scenario | Impact | Mitigation Strategy |
|---|---|---|---|
| **Spoofing** | Attacker impersonates a clinical administrator to modify intake drafts. | Unauthorized modification of medical intake questions. | **M-1:** Administrative routes require authenticated Supabase Auth JWT. Every API handler verifies workspace membership in `admin_memberships` table. |
| **Spoofing** | Attacker guesses a patient's session ID to access or alter their intake progress. | Unauthorized access to patient answers. | **M-2:** `session_reference` is a public lookup identifier only. Access requires an ephemeral `HttpOnly; SameSite=Strict; Secure` capability cookie OR cryptographic proof of a high-entropy recovery code (`BK-XXXX-XXXX-XXXX`). |
| **Tampering** | Administrator modifies a published intake form to alter questions after patients submitted answers. | Fraudulent clinical records; corrupted audit trail. | **M-3:** Published versions are stored in `published_versions` with a PostgreSQL trigger raising exceptions on any `UPDATE` or `DELETE`. |
| **Tampering** | Patient uses DevTools to submit answers to hidden questions or bypass validation limits. | Corrupted or malicious data injected into clinical records. | **M-4:** The server recalculates conditional visibility from scratch against the pinned version snapshot, automatically pruning hidden fields and rejecting unlisted choices. |
| **Repudiation** | An editor claims they did not delete or archive a critical clinical form. | Lack of accountability. | **M-5:** `audit_events` logs every administrative action with actor user ID, workspace ID, timestamp, and action type (excluding sensitive clinical payloads). |
| **Information Disclosure** | Patient answers or session secrets leak through URLs into browser history, analytics, or HTTP Referer headers. | Patient Health Information (PHI) compromise. | **M-6:** Form answers and recovery tokens are NEVER passed via URL parameters. `Referrer-Policy: strict-origin-when-cross-origin` and `Cache-Control: private, no-store` are enforced on all clinical endpoints. |
| **Information Disclosure** | Verbose server error messages leak SQL table schemas or database connection strings. | Reconnaissance vector for attackers. | **M-7:** Standardized error envelopes with generic error codes (`INTERNAL_ERROR`, `INVALID_ANSWER`). Database exceptions and stack traces are swallowed before reaching HTTP responses. |
| **Denial of Service** | Attacker brute-forces the 16-character patient recovery code to hijack a session. | Session takeover or resource exhaustion. | **M-8:** Recovery code verification is rate-limited via database counters (`recovery_attempts_count` capped at 5 per 15-minute window with exponential backoff). |
| **Elevation of Privilege** | Editor belonging to Workspace A accesses or edits drafts belonging to Workspace B (IDOR). | Cross-tenant data breach. | **M-9:** All database operations strictly join against the caller's verified `workspace_id`. Direct lookups by raw UUID without tenant scoping are strictly prohibited. |

---

## 3. Cryptographic Storage of Patient Recovery Credentials

1. **Recovery Code Generation:**
   - Format: `BK-[4 chars]-[4 chars]-[4 chars]-[4 chars]` using base-32 crockford alphabet (excluding ambiguous letters `0, O, 1, I, L`).
   - Entropy: 16 characters $\times 5\text{ bits} = 80\text{ bits}$ of cryptographic entropy (generated via `crypto.getRandomValues`).

2. **Server-Side Storage:**
   - The plaintext recovery code is displayed **once** in the initial JSON response and is NEVER stored in the database.
   - The database stores:
     $$\text{recovery\_hash} = \text{HMAC-SHA256}(\text{recovery\_code}, \text{APP\_SESSION\_PEPPER})$$
   - Verification uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

3. **Rotation Upon Redemption:**
   - When a patient resumes on another device, the verified recovery code is immediately revoked, and a fresh recovery code is generated and presented, preventing replay attacks.

---

## 4. Privacy & Logging Safeguards

- **Zero Clinical Logging:** Application logs (`console.log`, log aggregators) must never record request bodies containing patient answers, recovery codes, or capability cookie values.
- **Audit Logs Contain Metadata Only:** `audit_events` stores entity IDs, timestamps, user IDs, and high-level actions (`form.published`, `draft.saved`), never question definitions or answers.

