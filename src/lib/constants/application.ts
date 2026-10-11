/** Shared behavior settings. Units are explicit at call sites. */
export const APPLICATION = {
  formsCacheFreshMs: 30_000,
  requestTimeoutMs: 30_000,
  autosaveDelayMs: 800,
  draftAutosaveDelayMs: 2_000,
  clipboardFeedbackMs: 2_000,
  testAuthCookieName: "bask_test_auth",
  testAuthLifetimeSeconds: 3_600,
  minimumSecretLength: 32,
} as const;
export const ROUTES = {
  home: "/",
  adminForms: "/admin/forms",
  adminLogin: "/admin/login",
  editForm: (formId: string) => `/admin/forms/${formId}/edit`,
  formResponses: (formId: string) => `/admin/forms/${formId}/responses`,
} as const;
export const HTTP = {
  jsonContentType: "application/json",
  acceptHeader: "Accept",
  contentTypeHeader: "Content-Type",
} as const;
export const API_ROUTES = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  forms: "/api/admin/forms",
  form: (id: string) => `/api/admin/forms/${encodeURIComponent(id)}`,
  publishForm: (id: string) =>
    `/api/admin/forms/${encodeURIComponent(id)}/publish`,
  formResponses: (id: string) =>
    `/api/admin/forms/${encodeURIComponent(id)}/responses`,
} as const;
export const QUESTION_DEFAULTS = {
  label: (index: number) => `Question ${index + 1}`,
  optionLabel: (index: number) => `Option ${index + 1}`,
  copyLabel: (label: string) => `${label} (Copy)`,
} as const;
