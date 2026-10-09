/**
 * Query keys that more than one module has to agree on: a loader prefetching into the cache and
 * the collection or invalidation that reads it back. Spelled as a literal on both sides they drift
 * silently — the loader warms one entry, the consumer fetches another, and the only symptom is an
 * extra round-trip. This module has no imports so the dependency-free collection layer can use it.
 */

export const queryKeys = {
  workspacesWithForms: (): string[] => ["workspaces-with-forms"],
  formListings: (): string[] => ["form-listings"],
  archivedFormListings: (): string[] => ["form-listings-archived"],
  favorites: (): string[] => ["favorites"],
  formVersions: (formId: string): string[] => ["form-versions", formId],
};
