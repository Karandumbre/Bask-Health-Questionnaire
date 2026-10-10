-- ==============================================================================
-- Bask Health Intake Studio — Initial Schema Migration
-- Version: 0001
-- Engine: PostgreSQL 15+ (Hosted Supabase PostgreSQL)
-- ==============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WORKSPACES
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADMIN MEMBERSHIPS (RBAC)
CREATE TABLE IF NOT EXISTS "admin_memberships" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE RESTRICT,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor' CHECK ("role" IN ('owner', 'editor')),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "revoked_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_memberships_user_ws" 
ON "admin_memberships" ("user_id", "workspace_id");

-- 3. FORMS
CREATE TABLE IF NOT EXISTS "forms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE RESTRICT,
    "name" TEXT NOT NULL,
    "latest_published_version_number" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "archived_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_forms_workspace" 
ON "forms" ("workspace_id") WHERE "archived_at" IS NULL;

-- 4. FORM DRAFTS (Optimistic Concurrency via Revision)
CREATE TABLE IF NOT EXISTS "form_drafts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL UNIQUE REFERENCES "forms"("id") ON DELETE RESTRICT,
    "definition_json" JSONB NOT NULL,
    "theme_json" JSONB NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 0,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PUBLISHED VERSIONS (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS "published_versions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL REFERENCES "forms"("id") ON DELETE RESTRICT,
    "version_number" INTEGER NOT NULL,
    "public_slug" TEXT NOT NULL UNIQUE,
    "definition_snapshot" JSONB NOT NULL,
    "theme_snapshot" JSONB NOT NULL,
    "draft_revision" BIGINT NOT NULL,
    "published_by" UUID NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "uq_pub_versions_form_ver" UNIQUE ("form_id", "version_number")
);

CREATE INDEX IF NOT EXISTS "idx_pub_versions_slug" 
ON "published_versions" ("public_slug");

CREATE INDEX IF NOT EXISTS "idx_pub_versions_form_ver" 
ON "published_versions" ("form_id", "version_number" DESC);

-- Trigger: Forbid UPDATE or DELETE on published_versions
CREATE OR REPLACE FUNCTION prevent_published_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table published_versions is immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_published_versions ON "published_versions";
CREATE TRIGGER trg_protect_published_versions
BEFORE UPDATE OR DELETE ON "published_versions"
FOR EACH ROW EXECUTE FUNCTION prevent_published_version_mutation();

-- 6. PUBLICATION OPERATIONS (Idempotent Publish Transactions)
CREATE TABLE IF NOT EXISTS "publication_operations" (
    "operation_id" UUID PRIMARY KEY,
    "form_id" UUID NOT NULL REFERENCES "forms"("id") ON DELETE RESTRICT,
    "draft_revision" BIGINT NOT NULL,
    "published_version_id" UUID NOT NULL UNIQUE REFERENCES "published_versions"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PATIENT SESSIONS
CREATE TABLE IF NOT EXISTS "patient_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_reference" TEXT NOT NULL UNIQUE,
    "published_version_id" UUID NOT NULL REFERENCES "published_versions"("id") ON DELETE RESTRICT,
    "status" TEXT NOT NULL DEFAULT 'in_progress' CHECK ("status" IN ('in_progress', 'completed')),
    "answer_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "revision" BIGINT NOT NULL DEFAULT 0,
    "credential_hash" TEXT NOT NULL,
    "recovery_hash" TEXT NOT NULL,
    "recovery_attempts_count" INTEGER NOT NULL DEFAULT 0,
    "recovery_last_attempt_at" TIMESTAMPTZ,
    "recovery_expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_patient_sessions_ref" 
ON "patient_sessions" ("session_reference");

CREATE INDEX IF NOT EXISTS "idx_patient_sessions_ver" 
ON "patient_sessions" ("published_version_id");

-- 8. SUBMISSIONS (Exact-once, Immutable per Session)
CREATE TABLE IF NOT EXISTS "submissions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL UNIQUE REFERENCES "patient_sessions"("id") ON DELETE RESTRICT,
    "published_version_id" UUID NOT NULL REFERENCES "published_versions"("id") ON DELETE RESTRICT,
    "answer_snapshot" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_submissions_ver_date" 
ON "submissions" ("published_version_id", "submitted_at" DESC);

-- Trigger: Forbid UPDATE or DELETE on submissions
CREATE OR REPLACE FUNCTION prevent_submission_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table submissions is immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_submissions ON "submissions";
CREATE TRIGGER trg_protect_submissions
BEFORE UPDATE OR DELETE ON "submissions"
FOR EACH ROW EXECUTE FUNCTION prevent_submission_mutation();

-- 9. AUDIT EVENTS
CREATE TABLE IF NOT EXISTS "audit_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE RESTRICT,
    "actor_user_id" UUID,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_audit_events_ws_time" 
ON "audit_events" ("workspace_id", "occurred_at" DESC);

