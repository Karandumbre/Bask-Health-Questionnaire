# Deployment & Infrastructure Architecture

This document outlines the deployment topology, environment isolation, and database migration process for **Intake Studio**.

---

## 1. Hosting Topology

```
                  ┌──────────────────────────────────────────────┐
                  │          GitHub Private Repository           │
                  │             (FirstNameBaskHealth)            │
                  └───────┬──────────────────────────────┬───────┘
                          │                              │
                (Push to main)                     (Pull Request)
                          │                              │
                          ▼                              ▼
          ┌───────────────────────────────┐ ┌───────────────────────────────┐
          │      Vercel Production        │ │        Vercel Preview         │
          │ https://intake-studio.vercel.app│ │  https://preview-*.vercel.app │
          └──────────────┬────────────────┘ └──────────────┬────────────────┘
                         │                                 │
                         ▼                                 ▼
          ┌───────────────────────────────┐ ┌───────────────────────────────┐
          │  Supabase Production Postgres │ │   Ephemeral Dev/Mock Database │
          │  (Port 6543 Pooled / 5432 Mig)│ │  (Zero Production Data)       │
          └───────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Environment Isolation & Guardrails

| Setting / Variable    | Vercel Preview (PR Branches)         | Vercel Production (`main`)                         |
| --------------------- | ------------------------------------ | -------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | Ephemeral Vercel Preview URL         | Custom domain / Production Vercel URL              |
| `DATABASE_URL`        | Development/Staging Supabase project | Dedicated Production Supabase project              |
| `DATABASE_DIRECT_URL` | Staging direct connection            | Production direct connection                       |
| `APP_SESSION_PEPPER`  | Development secret                   | Production cryptographically random 32-byte secret |
| Access                | Team reviewers only                  | Public patient access + private admin login        |

### Critical Rule: No Production Data in Previews

Preview deployments must NEVER point to the production PostgreSQL database. Connecting preview builds to production risks data corruption from experimental branches and violates patient data isolation.

---

## 3. Database Migration Workflow (Gated Execution)

Database migrations are located in `db/migrations/` as numbered SQL scripts and managed via Drizzle ORM (`drizzle-kit`).

### Policy: Migrations Are NEVER Run by Vercel Build Commands

Running `drizzle-kit migrate` during Vercel's `npm run build` is strictly prohibited:

1. Every preview branch would attempt to execute migrations against the database.
2. Concurrent builds could create race conditions and schema locks.

### Execution Procedure:

1. **Local Development / PR:**
   - Author schema changes in `src/lib/db/schema.ts`.
   - Generate SQL migration: `npm run db:generate`.
   - Test against local/ephemeral PostgreSQL: `npm run db:migrate`.
2. **Production Release:**
   - Merge approved PR into `main`.
   - Execute production migration via secure CI pipeline or authorized operator using `DATABASE_DIRECT_URL`.
   - Vercel automatically deploys the updated application code to production.

---

## 4. Supabase Free-Tier Operational Limits & Mitigations

1. **Connection Pooling (Supavisor):**
   - Direct PostgreSQL connections (`port 5432`) are strictly limited on Supabase free-tier (typically $\le 60$ max connections).
   - In serverless environments like Vercel, every lambda execution can open connections, quickly saturating the database.
   - **Mitigation:** The application uses Supabase's transaction pooler (`port 6543`) for all queries in serverless Route Handlers. Direct connection (`port 5432`) is reserved exclusively for migrations and DDL statements.

2. **Project Inactivity Pausing:**
   - Supabase free-tier projects pause after 1 week of inactivity.
   - Ensure an active health check or ping keeps the database warm prior to assessment evaluation.

3. **Storage & Egress Limits:**
   - Free tier includes 500MB database storage.
   - Using JSONB aggregates with lean schemas ensures thousands of intakes easily fit within quota.

## Disposable database verification

PostgreSQL integration tests require a separate disposable database and `IS_TEST_DATABASE=true`. CI reads `TEST_DATABASE_URL` and `TEST_DATABASE_DIRECT_URL` for this suite, rather than the application's database secrets. If those test secrets are absent, CI skips integration tests. The build uses a dummy database URL and does not connect to it during compilation.

Keep `APP_SESSION_PEPPER` at least 32 characters long; patient services fail closed when it is missing or weak. Test authentication must remain disabled on deployed environments. No migrations or live database tests were run as part of the maintainability refactor.
