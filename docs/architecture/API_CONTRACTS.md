# API Contracts & Error Specifications

This document defines the HTTP API contracts, compare-and-swap (CAS) protocols, and standardized error schemas for **Intake Studio**.

---

## 1. Standard Error Envelope

All API errors return a standard envelope with a machine-readable error code. **Error responses never echo patient answers, recovery tokens, or database stack traces.**

```json
{
  "success": false,
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "The draft has been modified by another administrator.",
    "details": {
      "expectedRevision": 4,
      "currentRevision": 5,
      "updatedAt": "2026-10-10T12:00:00Z"
    }
  }
}
```

### Error Code Catalog

| Code                   | HTTP Status | Description                                                               | Safe Details Returned                  |
| ---------------------- | ----------- | ------------------------------------------------------------------------- | -------------------------------------- |
| `UNAUTHORIZED`         | 401         | Missing or invalid administrative credentials.                            | None                                   |
| `FORBIDDEN`            | 403         | User does not have access to the target workspace or resource.            | `resourceType`                         |
| `NOT_FOUND`            | 404         | Form, draft, version, or session not found.                               | `resourceType`                         |
| `REVISION_CONFLICT`    | 409         | CAS failed: target revision does not match current server revision.       | `expectedRevision`, `currentRevision`  |
| `INVALID_FORM`         | 422         | Form schema or dependency validation failed on publish.                   | Array of `{ questionId, issue, code }` |
| `INVALID_ANSWER`       | 422         | Field-level validation failed on progress save or submission.             | Array of `{ questionId, issue }`       |
| `PUBLISH_CONFLICT`     | 409         | Publish requested against stale revision or concurrent publish in flight. | `currentRevision`                      |
| `SESSION_UNAUTHORIZED` | 401         | Invalid patient capability cookie or missing recovery credentials.        | None                                   |
| `SESSION_EXPIRED`      | 410         | Patient intake session has expired.                                       | `expiresAt`                            |
| `SESSION_COMPLETED`    | 409         | Attempted to alter an already finalized intake session.                   | `submittedAt`                          |
| `RESUME_RATE_LIMITED`  | 429         | Exceeded maximum attempts for recovery code verification.                 | `retryAfterSeconds`                    |
| `INTERNAL_ERROR`       | 500         | Unexpected server error. Detailed logs retained server-side only.         | None                                   |

---

## 2. Admin Workspace & Draft Contracts

### 2.1. List Forms

- **Endpoint:** `GET /api/admin/forms`
- **Auth:** Supabase Auth JWT (`sb-access-token`) + Workspace Member
- **Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      "name": "General Health Intake",
      "latestPublishedVersionNumber": 1,
      "latestSlug": "gh-intake-9a2f",
      "hasUnpublishedDraft": true,
      "draftRevision": 7,
      "updatedAt": "2026-10-10T11:45:00Z",
      "createdAt": "2026-10-10T10:00:00Z"
    }
  ]
}
```

### 2.2. Create Form

- **Endpoint:** `POST /api/admin/forms`
- **Request Body:**

```json
{
  "workspaceId": "w11d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "name": "Cardiology Screening"
}
```

- **Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "formId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "draftId": "d81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "name": "Cardiology Screening",
    "revision": 0
  }
}
```

### 2.3. Get Form & Draft Aggregate

- **Endpoint:** `GET /api/admin/forms/:formId`
- **Response (200 OK):**

```json
{
  "success": true,
  "form": {
    "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "workspaceId": "w11d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "name": "Cardiology Screening",
    "latestPublishedVersionNumber": 1
  },
  "draft": {
    "id": "d81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "formId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "revision": 3,
    "updatedAt": "2026-10-10T11:45:00Z"
  },
  "definition": {
    "schemaVersion": 1,
    "title": "Cardiology Screening",
    "questions": []
  },
  "theme": {
    "presetName": "Ocean",
    "isCustomShuffle": false,
    "light": {
      "background": "#F8FAFC",
      "surface": "#FFFFFF",
      "textPrimary": "#0F172A",
      "primaryAction": "#0284C7"
    },
    "dark": {
      "background": "#0B1120",
      "surface": "#1E293B",
      "textPrimary": "#F8FAFC",
      "primaryAction": "#38BDF8"
    }
  }
}
```

### 2.4. Autosave Draft or Rename Form (Compare-and-Swap)

- **Endpoint:** `PATCH /api/admin/forms/:formId`
- **Headers:** Requires same-origin `Origin` header (`verifyRequestOrigin`)
- **Request Body (Draft Autosave):**

```json
{
  "expectedRevision": 3,
  "definition": {
    "schemaVersion": 1,
    "title": "Cardiology Screening Updated",
    "questions": [
      {
        "id": "q1-uuid",
        "type": "single_select",
        "label": "Do you experience chest pain?",
        "required": true,
        "visibility": null,
        "options": [
          { "id": "opt-yes", "label": "Yes" },
          { "id": "opt-no", "label": "No" }
        ]
      }
    ]
  },
  "theme": { ... }
}
```

- **Request Body (Rename Form with CAS):**

```json
{
  "name": "Cardiology Screening — Updated",
  "expectedRevision": 3
}
```

- **Response (200 OK - Win):**

```json
{
  "success": true,
  "revision": 4,
  "updatedAt": "2026-10-10T11:45:05Z"
}
```

- **Response (409 Conflict - Lose):**

```json
{
  "success": false,
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Draft was updated by another user. Local revision is stale.",
    "details": {
      "expectedRevision": 3,
      "currentRevision": 4
    }
  }
}
```

### 2.5. Delete or Archive Form

- **Endpoint:** `DELETE /api/admin/forms/:formId`
- **Behavior:** Permanently deletes unpublished drafts; if the form already has published versions, falls back to non-destructive archival (`archived_at = NOW()`) to preserve historical responses.

### 2.6. Transactional Publish Form

- **Endpoint:** `POST /api/admin/forms/:formId/publish`
- **Request Body:**

```json
{
  "expectedRevision": 4,
  "operationId": "91e6bf60-7dec-11d0-a765-00a0c91e6bf6"
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "publishedVersionId": "v81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "versionNumber": 2,
  "publicSlug": "cardiology-screen-v2-8k2p",
  "publicUrl": "/intake/cardiology-screen-v2-8k2p",
  "publishedAt": "2026-10-10T11:50:00Z"
}
```

### 2.7. List & Inspect Form Responses

- **Endpoint:** `GET /api/admin/forms/:formId/responses?limit=50&offset=0` (or `?submissionId=:submissionId` for detail view)
- **Auth:** Supabase Auth JWT + `requireFormWorkspaceAccess`
- **Response (200 OK):** Returns paginated submission summaries or full submission detail joined with the immutable `published_versions` snapshot (`definitionSnapshot`, `themeSnapshot`, `versionNumber`, `submittedAt`, and `answers`).

---

## 3. Patient Intake Contracts

### 3.1. Inspect or Initialize Patient Session

- **Endpoints:**
  - `GET /api/patient/forms/:slug` — Fetches the immutable published form definition & theme snapshot.
  - `GET /api/patient/forms/:slug/session` — Checks the browser's capability cookie (`bask_session_${slug}`) for an active or completed session pinned to its original `published_version_id`.
  - `POST /api/patient/forms/:slug/session` — Starts a new patient session pinned to the published version.
- **Response (`POST`, 201 Created):**
- **Set-Cookie Header:** `bask_session_${slug}=<sessionId>.<capabilityToken>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`

```json
{
  "success": true,
  "data": {
    "sessionId": "s81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "sessionReference": "BKS-9A4F-71KQ",
    "recoveryCode": "BK-7M4P-88XZ-11QR-55TW",
    "publicSlug": "cardiology-screen-v2-8k2p",
    "versionNumber": 2,
    "definition": { ... },
    "theme": { ... },
    "currentAnswers": {},
    "sessionRevision": 0
  }
}
```

### 3.2. Cross-Browser Session Resumption

- **Endpoint:** `POST /api/patient/session/resume`
- **Request Body:**

```json
{
  "sessionReference": "BKS-9A4F-71KQ",
  "recoveryCode": "BK-7M4P-88XZ-11QR-55TW"
}
```

- **Response (200 OK):**
- **Set-Cookie Header:** Sets fresh namespaced `bask_session_${publicSlug}` capability cookie.

```json
{
  "success": true,
  "data": {
    "sessionId": "s81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "sessionReference": "BKS-9A4F-71KQ",
    "newRecoveryCode": "BK-2X9L-44TW-99JM-88KP",
    "publicSlug": "cardiology-screen-v2-8k2p",
    "versionNumber": 2,
    "definition": { ... },
    "theme": { ... },
    "currentAnswers": {
      "q1-uuid": "opt-yes"
    },
    "sessionRevision": 3
  }
}
```

- **Response (429 Too Many Requests):**

```json
{
  "success": false,
  "error": {
    "code": "RESUME_RATE_LIMITED",
    "message": "Too many recovery attempts. Please try again in 15 minutes.",
    "details": {
      "retryAfterSeconds": 900
    }
  }
}
```

### 3.3. Save Progress (CAS In-Progress Autosave)

- **Endpoint:** `PUT /api/patient/session/progress`
- **Auth:** Namespaced Capability Cookie (`bask_session_${publicSlug}`)
- **Request Body:**

```json
{
  "publicSlug": "cardiology-screen-v2-8k2p",
  "expectedSessionRevision": 3,
  "answers": {
    "q1-uuid": "opt-yes",
    "q2-uuid": "Severe pain radiating to left arm"
  }
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionRevision": 4,
    "sanitizedAnswers": {
      "q1-uuid": "opt-yes",
      "q2-uuid": "Severe pain radiating to left arm"
    }
  }
}
```

### 3.4. Final Submission (Exact-Once)

- **Endpoint:** `POST /api/patient/session/submit`
- **Auth:** Namespaced Capability Cookie (`bask_session_${publicSlug}`)
- **Request Body:**

```json
{
  "publicSlug": "cardiology-screen-v2-8k2p",
  "answers": {
    "q1-uuid": "opt-yes",
    "q2-uuid": "Severe pain radiating to left arm",
    "q3-uuid": 45
  }
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "submissionId": "sub-81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "sessionId": "s81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "submittedAt": "2026-10-10T12:05:00Z",
    "status": "completed",
    "isIdempotentReplay": false
  }
}
```
