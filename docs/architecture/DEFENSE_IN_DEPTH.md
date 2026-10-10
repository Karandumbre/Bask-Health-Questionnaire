# Defense-in-Depth Authorization & Database Security Strategy

This document details the multi-layered security model, database roles, grants, and access control boundaries implemented in **Intake Studio**.

---

## 1. Threat Profile & Architectural Reality

In a typical Supabase architecture, browser clients use the Supabase client SDK and rely on PostgreSQL Row-Level Security (RLS) policies evaluated under the `anon` or `authenticated` PostgreSQL roles.

However, **Intake Studio adopts a server-side Drizzle ORM architecture** (ADR-003). In this model:

- Browser clients **never** connect directly to PostgreSQL.
- Server-side Next.js Route Handlers and Server Actions connect via connection strings (`DATABASE_URL`, `DATABASE_DIRECT_URL`).
- PostgreSQL connection pooler connections execute under the administrative database role (`postgres`).
- By default in PostgreSQL, table owners and superusers bypass RLS policies unless `FORCE ROW LEVEL SECURITY` is explicitly declared.

**Crucial Security Rule:**

> **Do not assume privileged Drizzle connections automatically enforce Supabase RLS.** The application service layer is the authoritative authorization boundary. Administrative and patient access control must be strictly enforced in code and backed by relational database constraints.

---

## 2. PostgreSQL Roles & Privilege Topology

| Role            | Environment                   | Access Level       | Description                                                                                                                                           |
| --------------- | ----------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgres`      | Server-only (Next.js Backend) | Superuser / Owner  | Used exclusively by server-side Drizzle connection pool (`postgres.js`). Full CRUD and DDL capabilities. Credentials never exposed to client bundles. |
| `service_role`  | Supabase Admin API            | Elevated Service   | Used for administrative auth management (e.g., seeding reviewers, inspecting auth users). Strictly forbidden in client bundles.                       |
| `authenticated` | Supabase Client SDK           | Restricted         | Represents a logged-in Supabase user. Not used for direct SQL in our architecture.                                                                    |
| `anon`          | Supabase Client SDK           | Public / Read-only | Used by browser SDK for public metadata. Not permitted direct SQL access to forms, drafts, or responses.                                              |

### Defense Principles

1. **Zero Client Secrets:** Client bundles contain only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `ANON_KEY`).
2. **Strict Server Separation:** All database connection strings (`DATABASE_URL`, `DATABASE_DIRECT_URL`) and cryptographic keys (`APP_SESSION_PEPPER`) are imported in server-only modules (`import "server-only"`).

---

## 3. Defense-in-Depth Security Layers

```text
Incoming Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Network Edge & Cookie Boundary (src/proxy.ts)      │
│ - Refreshes expired Supabase Auth tokens                    │
│ - Sets SameSite=Strict, HttpOnly, Secure cookie flags        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Cryptographic Server Authentication               │
│ - Validates JWT claims via auth.getClaims()                 │
│ - Fallback re-verification via auth.getUser()               │
│ - Explicitly rejects unverified auth.getSession() alone     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Application Workspace Authorization (RBAC)         │
│ - requireAdmin(): rejects public patients                   │
│ - requireWorkspaceMembership(userId, wsId, role)            │
│ - Every query explicitly scoped: WHERE workspace_id = $wsId │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Concurrency & Transaction Control (CAS)            │
│ - UPDATE ... WHERE revision = expectedRevision              │
│ - Raises HTTP 409 REVISION_CONFLICT on stale edits          │
│ - SELECT ... FOR UPDATE during publish & submit             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Patient Capability & Privacy Boundary              │
│ - No answers or secrets in URLs                              │
│ - High-entropy HMAC-SHA256 recovery tokens (stored hashed)  │
│ - Atomic single-use code rotation on resume                 │
│ - Rate limiting (max 5 attempts per 15m)                     │
│ - Server-side hidden-answer pruning                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 6: PostgreSQL Triggers & Relational Constraints       │
│ - UNIQUE(session_id) on submissions (exact-once submit)     │
│ - ON DELETE RESTRICT on historical records                  │
│ - trg_protect_published_versions: blocks UPDATE/DELETE      │
│ - trg_protect_submissions: blocks UPDATE/DELETE             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Role-Based Access Control (RBAC) Specifications

### Roles Defined

- **`owner`**:
  - Can manage workspace members (invite, change roles, revoke).
  - Can archive forms.
  - Can create, edit, duplicate, and publish forms.
  - Can view all clinical submissions and audit logs.
- **`editor`**:
  - Can create, edit, duplicate, and publish form drafts.
  - Can view form submissions.
  - _Cannot_ archive forms or modify workspace membership.
- **`public_patient`**:
  - Anonymous patient interacting via public intake slug.
  - **Zero administrative privileges.**
  - Restricted strictly to reading the pinned published snapshot and managing their own session answers via an authenticated capability cookie.

### Workspace Isolation Guarantee

Every database mutation in `draft-service.ts` and `publish-service.ts` begins by resolving the form's `workspace_id` and confirming active membership for `userId`:

```typescript
const { form, membership } = await requireFormWorkspaceAccess(formId, user.id);
// Proceed only within the validated workspace context
```

---

## 5. Patient Capability Isolation & Recovery Security

1. **Session Reference (`BKS-XXXX-XXXX`):** Public, non-secret human-readable reference for support lookup.
2. **Capability Token:** 32-byte cryptographically secure random token stored in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie. Stored server-side as `HMAC_SHA256(token, APP_SESSION_PEPPER)`.
3. **Recovery Code (`BK-XXXX-XXXX-XXXX-XXXX`):** 16-byte random token displayed once to the patient. Stored server-side exclusively as `HMAC_SHA256(code, APP_SESSION_PEPPER)`.
4. **Constant-Time Verification:** Verified using Node.js `crypto.timingSafeEqual` to eliminate timing attacks.
5. **Atomic Rotation:** Upon successful redemption, the old recovery code is immediately invalidated, and a new recovery code + new capability cookie are generated and returned.
6. **Rate Limiting:** If 5 failed recovery attempts occur within 15 minutes, subsequent attempts are rejected with `HTTP 429 RESUME_RATE_LIMITED` without checking the hash.
