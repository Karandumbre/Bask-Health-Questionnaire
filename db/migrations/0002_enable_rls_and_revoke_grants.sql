-- ==============================================================================
-- Bask Health Intake Studio — Enable Row Level Security & Revoke Data API Access
-- Version: 0002
-- Engine: PostgreSQL 15+ (Hosted Supabase PostgreSQL)
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES (DEFAULT-DENY)
ALTER TABLE IF EXISTS "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "admin_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "form_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "published_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "publication_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "patient_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "patient_sessions" ADD COLUMN IF NOT EXISTS "previous_recovery_hash" TEXT;
ALTER TABLE IF EXISTS "patient_sessions" ADD COLUMN IF NOT EXISTS "previous_recovery_rotated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "patient_sessions" ADD COLUMN IF NOT EXISTS "recovery_replay_payload" TEXT;
ALTER TABLE IF EXISTS "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_schema_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. REVOKE PERMISSIONS FROM ANON AND AUTHENTICATED ROLES
-- Revoking table and routine access prevents callers from bypassing application
-- authorization via Supabase PostgREST Data API.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "workspaces", "admin_memberships", "forms", "form_drafts",
          "published_versions", "publication_operations", "patient_sessions",
          "submissions", "audit_events" FROM anon;
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
        REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "workspaces", "admin_memberships", "forms", "form_drafts",
          "published_versions", "publication_operations", "patient_sessions",
          "submissions", "audit_events" FROM authenticated;
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
        REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;
    END IF;
END $$;
