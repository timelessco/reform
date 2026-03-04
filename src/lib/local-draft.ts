/**
 * Local draft form utilities
 * Manages dynamic UUIDs for local draft forms to avoid ID collisions during sync
 */

const LOCAL_FORM_ID_KEY = "local-draft-form-id";
const LOCAL_WORKSPACE_ID_KEY = "local-draft-workspace-id";
const LOCAL_SETTINGS_ID_KEY = "local-draft-form-settings-id";

/**
 * Gets or creates a unique local form ID for this browser session.
 * This ensures each user has a unique form ID, preventing collisions during sync.
 */
export function getLocalFormId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  let id = localStorage.getItem(LOCAL_FORM_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_FORM_ID_KEY, id);
  }
  return id;
}

/**
 * Gets or creates a unique local workspace ID for this browser session.
 */
export function getLocalWorkspaceId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  let id = localStorage.getItem(LOCAL_WORKSPACE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_WORKSPACE_ID_KEY, id);
  }
  return id;
}

/**
 * Gets or creates a unique local form settings ID for this browser session.
 */
export function getLocalFormSettingsId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  let id = localStorage.getItem(LOCAL_SETTINGS_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LOCAL_SETTINGS_ID_KEY, id);
  }
  return id;
}

/**
 * Clears local draft IDs after successful sync.
 * Should be called after forms are synced to cloud to allow fresh drafts.
 */
export function clearLocalDraftIds(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_FORM_ID_KEY);
  localStorage.removeItem(LOCAL_WORKSPACE_ID_KEY);
  localStorage.removeItem(LOCAL_SETTINGS_ID_KEY);
}

/**
 * Session storage key for triggering sync after login
 */
export const SYNC_AFTER_LOGIN_KEY = "shouldSyncAfterLogin";

/**
 * Sets flag to trigger sync after navigating to dashboard
 */
export function setSyncAfterLoginFlag(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SYNC_AFTER_LOGIN_KEY, "true");
}

/**
 * Checks and clears the sync flag, returning whether sync should run
 */
export function consumeSyncAfterLoginFlag(): boolean {
  if (typeof window === "undefined") return false;
  const shouldSync = sessionStorage.getItem(SYNC_AFTER_LOGIN_KEY) === "true";
  if (shouldSync) {
    sessionStorage.removeItem(SYNC_AFTER_LOGIN_KEY);
  }
  return shouldSync;
}
