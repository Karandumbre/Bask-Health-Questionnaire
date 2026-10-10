import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Workspaces: Multi-tenant boundary for clinical organizations.
 */
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Admin Memberships: Role assignment per workspace (RBAC).
 * Identifiers map directly to Supabase Auth (auth.users.id).
 */
export const adminMemberships = pgTable(
  "admin_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull(),
    role: text("role", { enum: ["owner", "editor"] }).notNull().default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_memberships_user_ws").on(table.userId, table.workspaceId),
  ]
);

/**
 * Forms: Identity container for a clinical form.
 * Deletion is modeled as archiving (archived_at) to preserve historical data.
 */
export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    latestPublishedVersionNumber: integer("latest_published_version_number")
      .notNull()
      .default(0),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_forms_workspace").on(table.workspaceId),
  ]
);

/**
 * Form Drafts: The single mutable working draft for a form.
 * Uses Compare-And-Swap (CAS) optimistic concurrency on monotonic `revision`.
 */
export const formDrafts = pgTable(
  "form_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    definitionJson: jsonb("definition_json").notNull(),
    themeJson: jsonb("theme_json").notNull(),
    revision: bigint("revision", { mode: "number" }).notNull().default(0),
    updatedBy: uuid("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_form_drafts_form_id").on(table.formId),
  ]
);

/**
 * Published Versions: Strictly immutable snapshots of form definition + theme tokens.
 * DB triggers forbid UPDATE and DELETE statements on this table.
 */
export const publishedVersions = pgTable(
  "published_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    publicSlug: text("public_slug").notNull(),
    definitionSnapshot: jsonb("definition_snapshot").notNull(),
    themeSnapshot: jsonb("theme_snapshot").notNull(),
    draftRevision: bigint("draft_revision", { mode: "number" }).notNull(),
    publishedBy: uuid("published_by").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pub_versions_form_ver").on(table.formId, table.versionNumber),
    unique("uq_pub_versions_slug").on(table.publicSlug),
    index("idx_pub_versions_slug").on(table.publicSlug),
    index("idx_pub_versions_form_ver").on(table.formId, table.versionNumber),
  ]
);

/**
 * Publication Operations: Idempotency registry for publish transactions.
 */
export const publicationOperations = pgTable(
  "publication_operations",
  {
    operationId: uuid("operation_id").primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    draftRevision: bigint("draft_revision", { mode: "number" }).notNull(),
    publishedVersionId: uuid("published_version_id")
      .notNull()
      .references(() => publishedVersions.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_pub_ops_version_id").on(table.publishedVersionId),
  ]
);

/**
 * Patient Sessions: Track in-progress intake sessions.
 * Pinned to a specific published version for their entire lifetime.
 */
export const patientSessions = pgTable(
  "patient_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionReference: text("session_reference").notNull(),
    publishedVersionId: uuid("published_version_id")
      .notNull()
      .references(() => publishedVersions.id, { onDelete: "restrict" }),
    status: text("status", { enum: ["in_progress", "completed"] })
      .notNull()
      .default("in_progress"),
    answerJson: jsonb("answer_json").notNull().default({}),
    revision: bigint("revision", { mode: "number" }).notNull().default(0),
    credentialHash: text("credential_hash").notNull(),
    recoveryHash: text("recovery_hash").notNull(),
    recoveryAttemptsCount: integer("recovery_attempts_count").notNull().default(0),
    recoveryLastAttemptAt: timestamp("recovery_last_attempt_at", { withTimezone: true }),
    recoveryExpiresAt: timestamp("recovery_expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("uq_patient_sessions_ref").on(table.sessionReference),
    index("idx_patient_sessions_ver").on(table.publishedVersionId),
  ]
);

/**
 * Submissions: Exactly-once immutable submission record per completed session.
 * DB triggers forbid UPDATE and DELETE statements on this table.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => patientSessions.id, { onDelete: "restrict" }),
    publishedVersionId: uuid("published_version_id")
      .notNull()
      .references(() => publishedVersions.id, { onDelete: "restrict" }),
    answerSnapshot: jsonb("answer_snapshot").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_submissions_session_id").on(table.sessionId),
    index("idx_submissions_ver_date").on(table.publishedVersionId, table.submittedAt),
  ]
);

/**
 * Audit Events: Non-sensitive administrative action logs.
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id"),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_events_ws_time").on(table.workspaceId, table.occurredAt),
  ]
);

// Relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  memberships: many(adminMemberships),
  forms: many(forms),
  auditEvents: many(auditEvents),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [forms.workspaceId],
    references: [workspaces.id],
  }),
  draft: one(formDrafts, {
    fields: [forms.id],
    references: [formDrafts.formId],
  }),
  versions: many(publishedVersions),
}));

export const publishedVersionsRelations = relations(publishedVersions, ({ one, many }) => ({
  form: one(forms, {
    fields: [publishedVersions.formId],
    references: [forms.id],
  }),
  sessions: many(patientSessions),
  submissions: many(submissions),
}));

export const patientSessionsRelations = relations(patientSessions, ({ one }) => ({
  version: one(publishedVersions, {
    fields: [patientSessions.publishedVersionId],
    references: [publishedVersions.id],
  }),
  submission: one(submissions, {
    fields: [patientSessions.id],
    references: [submissions.sessionId],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  session: one(patientSessions, {
    fields: [submissions.sessionId],
    references: [patientSessions.id],
  }),
  version: one(publishedVersions, {
    fields: [submissions.publishedVersionId],
    references: [publishedVersions.id],
  }),
}));

