/** Shared application copy. Keep protocol identifiers and schema keys near their contracts. */
export const APP_MESSAGES = {
  INTAKE_ALREADY_SUBMITTED: "Intake already submitted",
  INTAKE_CONFIRMATION_LOADING:
    "Your responses are recorded. Retrieving your submission confirmation...",
  INTAKE_CONFIRMATION_UNAVAILABLE:
    "Your intake is already submitted and cannot be edited. We could not retrieve the confirmation details. Please retry.",
  RETRY_CONFIRMATION: "Retry confirmation",
  INTAKE_SESSION_ENDED_TITLE: "Intake session ended",
  INTAKE_SESSION_ENDED_MESSAGE:
    "Your session has expired or is no longer authorized. Resume with your recovery code, or start a new intake. Any unsaved answers remain on this page until you start again.",
  START_NEW_INTAKE: "Start new intake",
  STARTING_INTAKE: "Starting intake...",
  RESUME_INTAKE: "Resume intake",
  RECOVERY_CODE_UNAVAILABLE:
    "Use the recovery code you saved when this session was created. Saving progress does not issue a new code.",
  SHARE_PATIENT_LINK:
    "Share this complete link with patients. No URL prefix is needed.",
  PREVIEW_VALIDATION_PASSED:
    "Preview validation passed. Nothing was submitted.",
  FIX_ANSWER_ERRORS:
    "Correct the highlighted fields before saving or submitting.",
  REFRESHING_FORMS: "Refreshing forms...",
  LOADING_FORMS: "Loading forms...",
  NETWORK_ERROR_LOADING_FORMS: "Unable to load forms. Please refresh to retry.",
  REFRESH: "Refresh",
  REFRESH_RESPONSES: "Refresh responses",
  RESPONSE_DETAIL: "Intake Response Detail",
  RESPONSE_SUBMITTED_SUMMARY: (date: string, version: number) =>
    `Submitted ${date} · Version ${version}`,
  RECORD_DETAILS: "Record details",
  RESPONSE_SESSION_REFERENCE: "Session reference",
  RESPONSE_RECORD_ID: "Response ID",
  RESPONSE_NOT_SHOWN: "Not shown to the patient.",
  RESPONSE_NO_ANSWER: "No answer provided.",
  RESPONSE_CHECKED: "Checked",
  RESPONSE_UNCHECKED: "Unchecked",
  CLOSE_DIALOG: "Close dialog",
  LOADING_INTAKE: "Loading intake form...",
  LOADING: "Loading...",
  RETRY: "Retry",
  RETRYING: "Retrying...",
  CREATING: "Creating...",
  DELETING: "Deleting...",
  SIGNING_OUT: "Signing out...",
  PUBLISHING: "Publishing...",
  RESTORING: "Restoring...",
  SUBMITTING: "Submitting...",
  COPYING: "Copying...",
  LOADING_RESPONSE_DETAIL: "Loading response details...",
  LOADING_RESPONSES: "Loading responses...",
  RESPONSES_LOAD_FAILED:
    "Unable to load responses. Please retry. Existing responses have not been deleted.",
  DETAIL_LOAD_FAILED:
    "Unable to load this response. Please retry or close the dialog to view another response.",
  FORMS_LOAD_FAILED: "Unable to load your forms. Please retry.",
  FORM_RENAMED: "Form renamed successfully.",
  FORM_REMOVED: "Form deleted or archived successfully.",
  CONFLICT_LOAD_FAILED:
    "Unable to load the latest draft. Your local changes are still available. Please retry.",
  CONFLICT_ACTION_FAILED:
    "Unable to resolve the draft conflict. Your local changes are still available. Please retry.",
  DRAFT_SAVE_FAILED:
    "Your changes could not be saved. Keep this page open and retry.",
  INTAKE_LOAD_FAILED: "Unable to load your intake. Please retry.",
  INTAKE_SAVE_FAILED:
    "Your latest answers could not be saved. They remain on this page. Keep it open and retry.",
  INTAKE_CONFLICT:
    "This session changed in another tab or device. Your answers remain on this page. Resume with your recovery code to load the latest session before editing again.",
  INTAKE_SUBMIT_FAILED:
    "Unable to submit your intake. Your answers remain on this page. Please retry.",
  INTAKE_VALIDATION_FAILED:
    "Please resolve the highlighted questions before submitting your intake.",
  RESUME_REQUIRED:
    "Please enter both your session reference and recovery code.",
  RESUME_FAILED:
    "Unable to resume. Please verify your reference and recovery code, then retry.",
  SAVE_PROGRESS: "Save progress",
  SUBMIT_RESPONSES: "Submit Responses",
  RESTORE_PROGRESS: "Restore Progress",
  ROUTE_ERROR_TITLE: "Unable to load this section",
  ROUTE_ERROR_MESSAGE:
    "Please retry. You can also return to the home page to open another section.",
  BACK_HOME: "Back to home",
  NETWORK_ERROR_DURING_AUTHENTICATION_PLEASE_RETRY:
    "Network error during authentication. Please retry.",
  REVIEWER_EMAIL: "Reviewer Email",
  PASSWORD: "Password",
  SIGNING_IN: "Signing in...",
  SIGN_IN_TO_INTAKE_STUDIO: "Sign in to Intake Studio",
  BH: "BH",
  INTAKE_STUDIO: "Intake Studio",
  INTAKE_STUDIO_REVIEWER_PORTAL: "Intake Studio — Reviewer Portal",
  SECURE_CLINICAL_ADMINISTRATION_AND_FORM_AUTHORING:
    "Secure clinical administration and form authoring",
  LOADING_LOGIN_FORM: "Loading login form...",
  AUTHORIZED_CLINICAL_PERSONNEL_REVIEWERS_ONLY_ALL_OPERATIONS_AUDITED:
    "Authorized clinical personnel & reviewers only. All operations audited.",
  FORM_HAD_PUBLISHED_VERSIONS_ARCHIVED_INSTEAD_OF_HARD_DELETED:
    "Form had published versions; archived instead of hard-deleted to preserve history.",
  NO_ACTIVE_CLINICAL_WORKSPACE_AVAILABLE:
    "No active clinical workspace available.",
  UNTITLED_CLINICAL_INTAKE: "Untitled Clinical Intake",
  INVALID_REVIEWER_CREDENTIALS: "Invalid reviewer credentials.",
  UNABLE_TO_SIGN_OUT_PLEASE_RETRY: "Unable to sign out. Please retry.",
  SESSION_ENDED_SUCCESSFULLY: "Session ended successfully.",
  INTAKE_STUDIO_BASK_HEALTH: "Intake Studio | Bask Health",
  CLINICAL_FORM_AUTHORING_AND_PATIENT_INTAKE_ENGINE:
    "Clinical form authoring and patient intake engine.",
  BASK_HEALTH_INTAKE_STUDIO: "Bask Health — Intake Studio",
  CLINICAL_FORM_AUTHORING_VERSIONED_PUBLISHING_RESPONSIVE_PATIENT_INTAKE_ENGINE:
    "Clinical form authoring, versioned publishing & responsive patient intake engine.",
  ENTER_ADMINISTRATIVE_EDITOR_FORMS: "Enter Administrative Editor & Forms",
  REVIEWER_LOGIN_PORTAL: "Reviewer Login Portal",
  BUILT_WITH_NEXT_JS_16_APP_ROUTER_SUPABASE_POSTGRESQL:
    "Built with Next.js 16 (App Router), Supabase PostgreSQL, and Polaris Icons.",
  THE_SAVE_RESPONSE_DID_NOT_ADVANCE_THE_DRAFT_REVISION:
    "The save response did not advance the draft revision.",
  YOU_HAVE_UNSAVED_CHANGES_ARE_YOU_SURE_YOU_WANT:
    "You have unsaved changes. Are you sure you want to leave?",
  BACK_TO_FORMS_DASHBOARD: "Back to Forms Dashboard",
  FORMS: "Forms",
  CLICK_TO_RENAME: "Click to rename",
  REV: "rev",
  EDITOR: "Editor",
  PATIENT_PREVIEW: "Patient Preview",
  DESKTOP_VIEWPORT: "Desktop viewport",
  MOBILE_VIEWPORT: "Mobile viewport",
  SAVED: "Saved",
  ALL_CHANGES_SAVED: "All changes saved",
  SAVE_REQUIRED_BEFORE_PUBLISH: "Changes must be saved before publishing",
  SAVING: "Saving...",
  UNSAVED: "Unsaved",
  CONFLICT: "Conflict",
  RETRY_SAVE: "Retry Save",
  PUBLISH: "Publish",
  CONDITIONAL_VISIBILITY: "Conditional Visibility",
  SHOW_ONLY_WHEN_AN_EARLIER_ANSWER_MATCHES:
    "Show only when an earlier answer matches",
  NO_ELIGIBLE_PARENT_FIELDS: "No eligible parent fields",
  CONDITIONS_REQUIRE_AN_EARLIER_SINGLE_CHOICE_QUESTION_THAT_IS:
    "Conditions require an earlier single-choice question that is marked Required and unconditional.",
  WHEN_PARENT_QUESTION: "When parent question:",
  SELECT_ELIGIBLE_QUESTION: "-- Select eligible question --",
  UNTITLED_SINGLE_SELECT: "Untitled Single-Select",
  INVALID_DEPENDENCY: "(Invalid dependency)",
  EQUALS_CHOICE: "Equals choice:",
  SELECT_CHOICE: "-- Select choice --",
  UNTITLED_CHOICE: "Untitled Choice",
  CONDITION_IS_VALID_AND_ACTIVE: "Condition is valid and active",
  REMOVE_BROKEN_CONDITION: "Remove broken condition",
  REMOVE_CONDITION: "Remove condition",
  THREE_WAY_DRAFT_CONFLICT_RESOLUTION: "Three-Way Draft Conflict Resolution",
  ANOTHER_ADMINISTRATOR_SAVED_CHANGES_TO_THIS_DRAFT_NON_OVERLAPPING:
    "Another administrator saved changes to this draft. Non-overlapping edits can be automatically merged into the latest server revision. Review the three-way merge summary below before applying.",
  BASE_ACKNOWLEDGED: "Base Acknowledged",
  FIELDS: "fields)",
  YOUR_LOCAL_UNSAVED: "Your Local Unsaved",
  FIELDS_2: "fields",
  LATEST_SERVER: "Latest Server",
  AUTO_MERGED_NON_OVERLAPPING_CHANGES: "Auto-Merged Non-Overlapping Changes (",
  OVERLAPPING_CONFLICT: "Overlapping Conflict",
  REQUIRE_RESOLUTION: "Require Resolution:",
  KEEP_LOCAL: "Keep Local",
  USE_SERVER: "Use Server",
  NO_OVERLAPPING_FIELD_COLLISIONS_ALL_CONCURRENT_EDITS_WERE_SAFELY:
    "No overlapping field collisions. All concurrent edits were safely combined.",
  LOADING_SERVER_DRAFT_COMPARISON: "Loading server draft comparison...",
  FIELD_DIFFERENCES_BREAKDOWN: "Field Differences Breakdown",
  MODIFIED: "modified",
  LOCAL_ADDITIONS: "local additions",
  SERVER_ADDITIONS: "server additions",
  UNTITLED_FIELD: "Untitled Field",
  ID: "ID:",
  LOCAL: "Local:",
  SERVER: "Server:",
  PREVENT_DATA_LOSS: "Prevent Data Loss",
  COPY_YOUR_LOCAL_DRAFT_JSON_TO_CLIPBOARD_BEFORE_CHOOSING:
    "Copy your local draft JSON to clipboard before choosing an action.",
  COPIED: "Copied!",
  COPY_JSON: "Copy JSON",
  DISCARD_LOCAL_ACCEPT_SERVER: "Discard Local & Accept Server",
  KEEP_ALL_MINE_OVERWRITE_SERVER: "Keep All Mine (Overwrite Server)",
  APPLY_RESOLVED_MERGE_SAVE_CAS: "Apply Resolved Merge & Save (CAS)",
  APPLY_SAFE_3_WAY_MERGE_SAVE_CAS: "Apply Safe 3-Way Merge & Save (CAS)",
  CREATE_CLINICAL_FORM: "Create Clinical Form",
  INITIALIZES_A_NEW_DRAFT_CONTAINER_READY_FOR_QUESTION_AUTHORING:
    "Initializes a new draft container ready for question authoring.",
  CLOSE_CREATE_FORM_DIALOG: "Close create form dialog",
  FORM_TITLE: "Form Title",
  E_G_ADULT_ADHD_INITIAL_SCREENING: "e.g. Adult ADHD Initial Screening",
  CANCEL: "Cancel",
  CREATE_OPEN: "Create & Open",
  UNTITLED_QUESTION: "Untitled Question",
  SHORT_TEXT_RESPONSE: "Short text response...",
  DETAILED_LONG_TEXT_RESPONSE: "Detailed long text response...",
  CONDITIONAL_DISPLAYS_ONLY_WHEN_PARENT_CONDITION_IS_SATISFIED:
    "Conditional: Displays only when parent condition is satisfied",
  SHORT_TEXT: "Short Text",
  SINGLE_LINE_RESPONSE_E_G_NAME_EMAIL:
    "Single-line response (e.g. name, email)",
  LONG_TEXT: "Long Text",
  MULTI_LINE_MEDICAL_DETAILS_OR_NOTES: "Multi-line medical details or notes",
  AGE_DOSAGE_OR_MEASUREMENT_VALUES: "Age, dosage, or measurement values",
  SINGLE_SELECT: "Single Select",
  RADIO_CHOICES_WITH_CONDITIONAL_SUPPORT:
    "Radio choices with conditional support",
  CHECKLIST_OF_MULTIPLE_OPTIONS: "Checklist of multiple options",
  CONSENT_CHECKBOX: "Consent / Checkbox",
  REQUIRED_ACKNOWLEDGMENT_OR_OPT_IN: "Required acknowledgment or opt-in",
  FORM_QUESTIONS: "Form Questions",
  ADD_NEW_FIELD: "Add new field",
  ADD_FIELD: "Add Field",
  SELECT_FIELD_TYPE: "Select Field Type",
  NO_QUESTIONS_ADDED_YET: "No questions added yet",
  CLICK_QUOT_ADD_FIELD_QUOT_ABOVE_TO_CREATE_CLINICAL:
    'Click "Add Field" above to create clinical intake questions.',
  REQUIRED: "Required",
  CONDITIONAL: "Conditional",
  HAS_VALIDATION_ISSUE: "Has validation issue",
  ISSUE: "Issue",
  THEME: "Theme:",
  QUESTIONS_TOTAL: "questions total",
  INTERACTIVE_PATIENT_SIMULATOR: "Interactive Patient Simulator",
  TESTING_LIVE_CONDITIONS_VISIBILITY_RESPONSES_HERE_ARE_NOT_SAVED:
    "Testing live conditions & visibility. Responses here are not saved to the database.",
  SUBMIT_INTAKE_SIMULATION: "Submit Intake (Simulation)",
  SIGN_OUT: "Sign Out",
  CLINICAL_INTAKE_FORMS: "Clinical Intake Forms",
  AUTHOR_PUBLISH_AND_REVIEW_VERSIONED_PATIENT_QUESTIONNAIRES:
    "Author, publish, and review versioned patient questionnaires.",
  CREATE_NEW_FORM: "Create New Form",
  SEARCH_FORMS: "Search forms",
  SEARCH_FORMS_BY_TITLE: "Search forms by title...",
  NO_CLINICAL_FORMS_FOUND: "No clinical forms found",
  GET_STARTED_BY_CREATING_YOUR_FIRST_PATIENT_INTAKE_QUESTIONNAIRE:
    "Get started by creating your first patient intake questionnaire.",
  CREATE_FORM_NOW: "+ Create Form Now",
  STATUS: "Status",
  WORKING_DRAFT: "Working Draft",
  LAST_UPDATED: "Last Updated",
  ACTIONS: "Actions",
  SAVE: "Save",
  PUBLISHED: "Published",
  PUBLISHED_V: "Published v",
  UNPUBLISHED_DRAFT: "Unpublished Draft",
  AT: "at",
  OPEN_EDITOR: "Open Editor",
  RENAME_FORM: "Rename form",
  ARCHIVE_OR_DELETE_FORM: "Archive or delete form",
  TOTAL_INTAKE_FORMS: "Total Intake Forms",
  REGISTERED_CLINICAL_QUESTIONNAIRES: "Registered clinical questionnaires",
  PUBLISHED_AND_LIVE: "Published & Live",
  DEPLOYED: "Deployed",
  LIVE_PATIENT_INTAKE_VERSIONS: "Live patient intake versions",
  WORKING_DRAFTS: "Working Drafts",
  UNPUBLISHED_FORMS_IN_PROGRESS: "Unpublished forms in progress",
  ALL_FORMS_COUNT: (count: number) => `All Forms (${count})`,
  PUBLISHED_COUNT: (count: number) => `Published (${count})`,
  DRAFTS_COUNT: (count: number) => `Drafts (${count})`,
  OPEN_LIVE_FORM: "Open Live Form",
  OPEN_LIVE_FORM_NEW_TAB: "Open deployed live form in new tab",
  COPY_DEPLOYED_LINK: "Copy live deployed intake form link",
  CLICK_TO_COPY_DEPLOYED_LINK: "Click to copy deployed link",
  RESPONSES: "Responses",
  LAST_EDITED: "Last edited",
  SAVE_THE_LATEST_CHANGES_AND_RESOLVE_ANY_DRAFT_CONFLICT:
    "Save the latest changes and resolve any draft conflict before publishing.",
  THE_FORM_WAS_PUBLISHED_BUT_THE_DRAFT_COULD_NOT:
    "The form was published, but the draft could not refresh. Reload the editor before continuing.",
  NETWORK_ERROR_DURING_PUBLICATION_PLEASE_RETRY:
    "Network error during publication. Please retry.",
  FORM_PUBLISHED_SUCCESSFULLY: "Form Published Successfully!",
  PUBLISH_IMMUTABLE_VERSION: "Publish Immutable Version",
  THIS_VERSION_SNAPSHOT_IS_NOW_LOCKED_AND_AVAILABLE_FOR:
    "This version snapshot is now locked and available for patient intake.",
  CREATES_AN_IMMUTABLE_SNAPSHOT_OF_ALL_QUESTIONS_AND_THEME:
    "Creates an immutable snapshot of all questions and theme settings.",
  CLOSE_PUBLISH_DIALOG: "Close publish dialog",
  VERSION: "Version",
  CREATED: "Created",
  PATIENT_SESSIONS_ON_THIS_VERSION_WILL_REMAIN_BOUND_TO:
    "Patient sessions on this version will remain bound to its exact questions forever.",
  PUBLIC_PATIENT_URL: "Public Patient URL",
  COPY_LINK: "Copy Link",
  OPEN_INTAKE_IN_NEW_TAB: "Open intake in new tab",
  DONE: "Done",
  CANNOT_PUBLISH: "Cannot Publish —",
  FOUND: "Found:",
  FIX_FIELD: "Fix Field",
  PUBLISH_READINESS_SUMMARY: "Publish Readiness Summary",
  CLINICAL_QUESTIONS: "clinical questions",
  CONDITIONAL_RULES: "conditional rules",
  DRAFT_REVISION: "• Draft revision:",
  ALL_CLINICAL_INVARIANTS_VERIFIED: "• All clinical invariants verified",
  CONFIRM_PUBLISH: "Confirm & Publish",
  MOVE_UP: "Move up",
  MOVE_DOWN: "Move down",
  NUMERIC_BOUNDS: "Numeric Bounds",
  LENGTH_LIMITS: "Length Limits",
  WHOLE_NUMBERS_ONLY: "Whole numbers only",
  NO_FIELD_SELECTED: "No field selected",
  SELECT_A_QUESTION_FROM_THE_NAVIGATOR_OR_CANVAS_TO:
    "Select a question from the navigator or canvas to configure its properties.",
  QUESTION_SETTINGS: "Question Settings",
  QUESTION_LABEL: "Question Label",
  E_G_DO_YOU_HAVE_ANY_ALLERGIES: "e.g. Do you have any allergies?",
  HELP_TEXT_INSTRUCTIONS: "Help Text / Instructions",
  ADDITIONAL_GUIDANCE_FOR_THE_PATIENT: "Additional guidance for the patient...",
  FIELD_PLACEHOLDER: "Field Placeholder",
  E_G_TYPE_YOUR_ANSWER: "e.g. Type your answer...",
  REQUIRED_RESPONSE: "Required Response",
  PATIENT_CANNOT_SUBMIT_WITHOUT_COMPLETING:
    "Patient cannot submit without completing",
  REQUIRED_RESPONSE_2: "Required response",
  OPTIONS: "Options (",
  ADD_CHOICE: "Add Choice",
  MUST_HAVE_AT_LEAST_2_CHOICES: "Must have at least 2 choices",
  DELETE_OPTION: "Delete option",
  AT_LEAST_2_CHOICES_ARE_REQUIRED: "At least 2 choices are required.",
  USEBUILDER_MUST_BE_USED_WITHIN_A_BUILDERPROVIDER:
    "useBuilder must be used within a BuilderProvider",
  NETWORK_ERROR_CREATING_FORM: "Network error creating form.",
  NETWORK_ERROR_DELETING_FORM: "Network error deleting form.",
  NETWORK_ERROR_RENAMING_FORM: "Network error renaming form.",
  NETWORK_ERROR_SIGNING_OUT: "Network error signing out.",
  FORM_NAME_CANNOT_BE_EMPTY: "Form name cannot be empty.",
  FAILED_TO_CREATE_FORM_CONTAINER: "Failed to create form container.",
  WORKING_DRAFT_NOT_FOUND_FOR_THIS_FORM:
    "Working draft not found for this form.",
  WORKING_DRAFT_NOT_FOUND: "Working draft not found.",
  FORMS_WITH_PUBLISHED_VERSIONS_CANNOT_BE_DELETED_ARCHIVE_THE:
    "Forms with published versions cannot be deleted. Archive the form instead.",
  FORM_NOT_FOUND_OR_HAS_BEEN_ARCHIVED: "Form not found or has been archived.",
  PUBLICATION_OPERATION_BELONGS_TO_A_DIFFERENT_FORM:
    "Publication operation belongs to a different form.",
  DRAFT_REVISION_HAS_CHANGED_PLEASE_REVIEW_THE_UPDATED_DRAFT:
    "Draft revision has changed. Please review the updated draft before publishing.",
  FAILED_TO_CREATE_PUBLISHED_VERSION_SNAPSHOT:
    "Failed to create published version snapshot.",
  SUBMISSION_RECORD_NOT_FOUND: "Submission record not found.",
  APP_SESSION_PEPPER_MUST_CONTAIN_AT_LEAST_32_CHARACTERS:
    "APP_SESSION_PEPPER must contain at least 32 characters.",
  INVALID_SESSION_CREDENTIALS: "Invalid session credentials.",
  INTAKE_SESSION_HAS_EXPIRED: "Intake session has expired.",
  INTAKE_FORM_NOT_FOUND_OR_IS_NO_LONGER_ACCEPTING:
    "Intake form not found or is no longer accepting submissions.",
  FAILED_TO_INITIALIZE_PATIENT_SESSION: "Failed to initialize patient session.",
  SESSION_NOT_FOUND: "Session not found.",
  INVALID_SESSION_REFERENCE_OR_RECOVERY_CODE:
    "Invalid session reference or recovery code.",
  INTAKE_SESSION_HAS_ALREADY_BEEN_COMPLETED:
    "Intake session has already been completed.",
  RECOVERY_CODE_HAS_EXPIRED: "Recovery code has expired.",
  FAILED_TO_ROTATE_RECOVERY_CREDENTIALS:
    "Failed to rotate recovery credentials.",
  RECOVERY_FAILED: "Recovery failed.",
  CANNOT_MODIFY_ANSWERS_FOR_A_COMPLETED_INTAKE_SESSION:
    "Cannot modify answers for a completed intake session.",
  ASSOCIATED_PUBLISHED_VERSION_NOT_FOUND:
    "Associated published version not found.",
  PATIENT_SESSION_WAS_UPDATED_BY_ANOTHER_REQUEST_PLEASE_RELOAD:
    "Patient session was updated by another request. Please reload.",
  FAILED_TO_RECORD_SUBMISSION: "Failed to record submission.",
  THEME_2: "Theme",
  CUSTOM_SHUFFLE: "Custom Shuffle",
  SHUFFLE: "Shuffle",
  USE: "Use",
  MODE: "mode",
  CLINICAL_WORKSPACE: "Clinical Workspace",
  FAILED_TO_INITIALIZE_WORKSPACE: "Failed to initialize workspace.",
  AUTHENTICATION_REQUIRED_FOR_ADMINISTRATIVE_ACCESS:
    "Authentication required for administrative access.",
  ACCESS_DENIED_YOU_ARE_NOT_A_MEMBER_OF_THIS:
    "Access denied: You are not a member of this workspace.",
  ACCESS_DENIED_OWNER_PRIVILEGES_REQUIRED_FOR_THIS_ACTION:
    "Access denied: Owner privileges required for this action.",
  FORM_NOT_FOUND: "Form not found.",
  DATABASE_URL_ENVIRONMENT_VARIABLE_IS_MISSING:
    "DATABASE_URL environment variable is missing.",
  DATABASE_DIRECT_URL_AND_DATABASE_URL_ARE_BOTH_MISSING:
    "DATABASE_DIRECT_URL and DATABASE_URL are both missing.",
  REVISION_CONFLICT_THE_RESOURCE_WAS_UPDATED_BY_ANOTHER_REQUEST:
    "Revision conflict: the resource was updated by another request",
  FORM_DEFINITION_DOES_NOT_MEET_PUBLISH_REQUIREMENTS:
    "Form definition does not meet publish requirements",
  ONE_OR_MORE_ANSWERS_FAILED_VALIDATION:
    "One or more answers failed validation",
  INVALID_OR_EXPIRED_SESSION_CREDENTIALS:
    "Invalid or expired session credentials",
  SESSION_HAS_ALREADY_BEEN_FINALIZED: "Session has already been finalized",
  TOO_MANY_RECOVERY_ATTEMPTS_PLEASE_TRY_AGAIN_LATER:
    "Too many recovery attempts. Please try again later.",
  REQUEST_DATA_IS_INVALID: "Request data is invalid.",
  AN_INTERNAL_SERVER_ERROR_OCCURRED: "An internal server error occurred.",
  UNABLE_TO_COPY_PLEASE_SELECT_AND_COPY_THE_TEXT:
    "Unable to copy. Please select and copy the text manually.",
  THE_SERVER_RETURNED_AN_UNREADABLE_RESPONSE_PLEASE_RETRY:
    "The server returned an unreadable response. Please retry.",
  THE_REQUEST_FAILED_PLEASE_RETRY: "The request failed. Please retry.",
  THE_REQUEST_TIMED_OUT_PLEASE_RETRY: "The request timed out. Please retry.",
  UNABLE_TO_REACH_THE_SERVER_CHECK_YOUR_CONNECTION_AND:
    "Unable to reach the server. Check your connection and retry.",
  UNABLE_TO_SEND_THE_REQUEST_PLEASE_RETRY:
    "Unable to send the request. Please retry.",
  THE_SERVER_RETURNED_AN_UNEXPECTED_RESPONSE_PLEASE_RETRY:
    "The server returned an unexpected response. Please retry.",
  REQUEST_BODY_MUST_BE_VALID_JSON: "Request body must be valid JSON.",
  CROSS_SITE_MUTATION_REJECTED_MISSING_HOST_HEADER:
    "Cross-site mutation rejected: Missing host header.",
  CROSS_SITE_MUTATION_REJECTED_MALFORMED_ORIGIN_HEADER:
    "Cross-site mutation rejected: Malformed origin header.",
  SUPABASE_PUBLIC_URL_AND_KEY_ARE_REQUIRED:
    "Supabase public URL and key are required.",
  REFERENCED_PARENT_QUESTION_NO_LONGER_EXISTS:
    "Referenced parent question no longer exists.",
  PARENT_QUESTION_MUST_APPEAR_BEFORE_THIS_QUESTION:
    "Parent question must appear before this question.",
  PARENT_QUESTION_MUST_BE_A_SINGLE_CHOICE_FIELD:
    "Parent question must be a single-choice field.",
  PARENT_QUESTION_MUST_BE_MARKED_REQUIRED:
    "Parent question must be marked Required.",
  PARENT_MUST_BE_UNCONDITIONAL_NESTED_CONDITIONS_ARE_FORBIDDEN:
    "Parent must be unconditional; nested conditions are forbidden.",
  REFERENCED_OPTION_NO_LONGER_EXISTS_IN_PARENT_QUESTION:
    "Referenced option no longer exists in parent question.",
  DEPENDS_ON_FORMATTED: (value0: unknown, value1: unknown) =>
    `depends on ${value0} (choice ${value1})`,
  NOT_PRESENT_ON_SERVER: "Not present on server",
  NOT_PRESENT_LOCALLY: "Not present locally",
  SERVER_FIELD_FORMATTED: (value0: unknown, value1: unknown) =>
    `Server field: "${value0}" (${value1})`,
  ENTER_TEXT: "Enter text...",
  ENTER_DETAILED_EXPLANATION: "Enter detailed explanation...",
  NUMERIC_QUESTION_FORMATTED: (value0: unknown) => `Numeric Question ${value0}`,
  SINGLE_CHOICE_QUESTION_FORMATTED: (value0: unknown) =>
    `Single-choice Question ${value0}`,
  MULTI_SELECT_QUESTION_FORMATTED: (value0: unknown) =>
    `Multi-select Question ${value0}`,
  I_ACKNOWLEDGE_AND_CONSENT_TO_THE_INTAKE_TERMS:
    "I acknowledge and consent to the intake terms",
  UPDATED_FORM_TITLE_TO_FORMATTED: (value0: unknown) =>
    `Updated form title to "${value0}"`,
  KEPT_LOCAL_FORM_TITLE_FORMATTED: (value0: unknown) =>
    `Kept local form title "${value0}"`,
  FORM_TITLE_WAS_EDITED_DIFFERENTLY_ON_LOCAL_FORMATTED: (
    value0: unknown,
    value1: unknown,
  ) =>
    `Form title was edited differently on local ("${value0}") and server ("${value1}").`,
  KEEP_LOCAL_FORMATTED: (value0: unknown) => `Keep local: "${value0}"`,
  USE_SERVER_FORMATTED: (value0: unknown) => `Use server: "${value0}"`,
  UPDATED_FORM_DESCRIPTION_FROM_SERVER: "Updated form description from server",
  KEPT_LOCAL_FORM_DESCRIPTION: "Kept local form description",
  FORM_DESCRIPTION_MODIFIED_DIFFERENTLY_ON_LOCAL_AND_SERVER:
    "Form description modified differently on local and server.",
  KEEP_LOCAL_DESCRIPTION: "Keep local description",
  USE_SERVER_DESCRIPTION: "Use server description",
  APPLIED_SERVER_THEME_FORMATTED: (value0: unknown) =>
    `Applied server theme (${value0})`,
  KEPT_LOCAL_THEME_FORMATTED: (value0: unknown) =>
    `Kept local theme (${value0})`,
  THEME_WAS_CHANGED_TO_FORMATTED: (value0: unknown, value1: unknown) =>
    `Theme was changed to "${value0}" locally and "${value1}" on the server.`,
  KEEP_LOCAL_THEME_FORMATTED: (value0: unknown) =>
    `Keep local theme (${value0})`,
  USE_SERVER_THEME_FORMATTED: (value0: unknown) =>
    `Use server theme (${value0})`,
  APPLIED_SERVER_EDITS_TO_FORMATTED: (value0: unknown) =>
    `Applied server edits to "${value0}"`,
  PRESERVED_LOCAL_EDITS_TO_FORMATTED: (value0: unknown) =>
    `Preserved local edits to "${value0}"`,
  BOTH_ADMINS_MADE_IDENTICAL_CHANGE_TO_FORMATTED: (value0: unknown) =>
    `Both admins made identical change to "${value0}"`,
  MULTIPLE_PROPERTIES: "multiple properties",
  KEEP_LOCAL_VERSION_FORMATTED: (value0: unknown) =>
    `Keep local version: "${value0}"`,
  USE_SERVER_VERSION_FORMATTED: (value0: unknown) =>
    `Use server version: "${value0}"`,
  KEPT_NEWLY_ADDED_QUESTION_FORMATTED: (value0: unknown) =>
    `Kept newly added question "${value0}"`,
  INCLUDED_SERVER_ADDED_QUESTION_FORMATTED: (value0: unknown) =>
    `Included server-added question "${value0}"`,
  QUESTION_ID_FORMATTED: (value0: unknown) =>
    `Question ID "${value0}" was created concurrently on both local and server.`,
  KEEP_LOCAL_FORMATTED_2: (value0: unknown) => `Keep local "${value0}"`,
  USE_SERVER_FORMATTED_2: (value0: unknown) => `Use server "${value0}"`,
  CONFIRM_DELETION_REMOVE_QUESTION: "Confirm deletion (remove question)",
  KEEP_MODIFIED_SERVER_QUESTION: "Keep modified server question",
  DELETED_QUESTION_FORMATTED: (value0: unknown) =>
    `Deleted question "${value0}"`,
  KEEP_LOCAL_EDITED_QUESTION: "Keep local edited question",
  ACCEPT_DELETION_REMOVE_QUESTION: "Accept deletion (remove question)",
  ACCEPTED_SERVER_DELETION_OF_FORMATTED: (value0: unknown) =>
    `Accepted server deletion of "${value0}"`,
  QUESTION_DISPLAY_ORDERING_WAS_REARRANGED_CONCURRENTLY_BY_BOTH:
    "Question display ordering was rearranged concurrently by both administrators.",
  USE_LOCAL_QUESTION_ORDERING: "Use local question ordering",
  USE_SERVER_QUESTION_ORDERING: "Use server question ordering",
  APPLIED_SERVER_QUESTION_REORDERING: "Applied server question reordering",
  PRESERVED_LOCAL_QUESTION_REORDERING: "Preserved local question reordering",
  OPTION_ID_MUST_NOT_BE_EMPTY: "Option ID must not be empty",
  QUESTION_ID_MUST_NOT_BE_EMPTY: "Question ID must not be empty",
  UNTITLED_FORM: "Untitled Form",
  FORM_TITLE_CANNOT_BE_BLANK: "Form title cannot be blank",
  FORM_MUST_CONTAIN_AT_LEAST_ONE_QUESTION_BEFORE:
    "Form must contain at least one question before publishing",
  DUPLICATE_QUESTION_ID_DETECTED_FORMATTED: (value0: unknown) =>
    `Duplicate question ID detected: "${value0}"`,
  MINIMUM_LENGTH_FORMATTED: (value0: unknown, value1: unknown) =>
    `Minimum length (${value0}) cannot be greater than maximum length (${value1})`,
  MINIMUM_VALUE_MUST_BE_A_FINITE_NUMBER:
    "Minimum value must be a finite number",
  MAXIMUM_VALUE_MUST_BE_A_FINITE_NUMBER:
    "Maximum value must be a finite number",
  MINIMUM_VALUE_FORMATTED: (value0: unknown, value1: unknown) =>
    `Minimum value (${value0}) cannot be greater than maximum value (${value1})`,
  MINIMUM_BOUND_MUST_BE_AN_INTEGER_WHEN_INTEGER:
    "Minimum bound must be an integer when integer-only is enabled",
  MAXIMUM_BOUND_MUST_BE_AN_INTEGER_WHEN_INTEGER:
    "Maximum bound must be an integer when integer-only is enabled",
  SELECT_QUESTION_MUST_HAVE_AT_LEAST_2_DISTINCT: (value0: unknown) =>
    `Select question must have at least 2 distinct choices (found ${value0})`,
  DUPLICATE_OPTION_LABEL_FORMATTED: (value0: unknown) =>
    `Duplicate option label "${value0}" detected in question`,
  DUPLICATE_OPTION_ID_FORMATTED: (value0: unknown) =>
    `Duplicate option ID "${value0}" detected in question`,
  ARE_YOU_SURE_YOU_WANT_TO_DELETE_OR: (value0: unknown) =>
    `Are you sure you want to delete or archive '${value0}'?`,
  SESSION_REFERENCE_IS_REQUIRED: "Session reference is required",
  RECOVERY_CODE_IS_REQUIRED: "Recovery code is required",
  UNKNOWN_QUESTION_ID_FORMATTED: (value0: unknown) =>
    `Unknown question ID "${value0}"`,
  ANSWER_SUBMITTED_FOR_AN_UNKNOWN_QUESTION:
    "Answer submitted for an unknown question.",
  REQUIRED_QUESTION_FORMATTED: (value0: unknown) =>
    `Required question "${value0}" was not answered`,
  REQUIRED_TEXT_FIELD_FORMATTED: (value0: unknown) =>
    `Required text field "${value0}" cannot be blank`,
  REQUIRED_CHECKBOX_FORMATTED: (value0: unknown) =>
    `Required checkbox "${value0}" must be checked`,
  REQUIRED_MULTI_SELECT_FORMATTED: (value0: unknown) =>
    `Required multi-select "${value0}" must have at least one choice selected`,
  VALUE_MUST_BE_A_STRING: "Value must be a string",
  TEXT_MUST_BE_AT_LEAST_FORMATTED: (value0: unknown) =>
    `Text must be at least ${value0} characters`,
  TEXT_CANNOT_EXCEED_FORMATTED: (value0: unknown) =>
    `Text cannot exceed ${value0} characters`,
  VALUE_MUST_BE_A_VALID_FINITE_NUMBER: "Value must be a valid, finite number",
  VALUE_MUST_BE_A_WHOLE_INTEGER: "Value must be a whole integer",
  NUMBER_MUST_BE_GREATER_THAN_OR_EQUAL_TO: (value0: unknown) =>
    `Number must be greater than or equal to ${value0}`,
  NUMBER_CANNOT_EXCEED_FORMATTED: (value0: unknown) =>
    `Number cannot exceed ${value0}`,
  SINGLE_SELECT_ANSWER_MUST_BE_AN_OPTION_ID:
    "Single-select answer must be an option ID string",
  OPTION_ID_FORMATTED: (value0: unknown) =>
    `Option ID "${value0}" is not a recognized choice for this question`,
  MULTI_SELECT_ANSWER_MUST_BE_AN_ARRAY_OF:
    "Multi-select answer must be an array of option IDs",
  OPTION_ID_FORMATTED_2: (value0: unknown) =>
    `Option ID "${value0}" is not a recognized choice for this question`,
  DUPLICATE_OPTION_SELECTION_FORMATTED: (value0: unknown) =>
    `Duplicate option selection "${value0}" is not permitted`,
  CHECKBOX_ANSWER_MUST_BE_A_BOOLEAN: "Checkbox answer must be a boolean",
  INVALID_HEX_COLOR: "Invalid hex color.",
  PRIMARY_TEXT_ON_BACKGROUND: "Primary Text on Background",
  PRIMARY_TEXT_ON_SURFACE: "Primary Text on Surface",
  SECONDARY_TEXT_ON_SURFACE: "Secondary Text on Surface",
  PRIMARY_ACTION_FOREGROUND_ON_ACTION_BG:
    "Primary Action Foreground on Action BG",
  SECONDARY_ACTION_FOREGROUND_ON_SECONDARY_ACTION_BG:
    "Secondary Action Foreground on Secondary Action BG",
  ERROR_TEXT_ON_SURFACE: "Error Text on Surface",
  CROSS_SITE_MUTATION_REJECTED_ORIGIN_FORMATTED: (
    value0: unknown,
    value1: unknown,
  ) =>
    `Cross-site mutation rejected: Origin '${value0}' does not match host '${value1}'.`,
} as const;
