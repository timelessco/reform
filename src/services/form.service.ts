import { editorDocCollection } from "@/db-collections";
import type { Value } from "platejs";

/**
 * Toggles the preview mode for a specific document.
 */
export async function togglePreview(id: string, currentIsPreview: boolean) {
  return editorDocCollection.update(id, (draft) => {
    draft.isPreview = !currentIsPreview;
    draft.updatedAt = Date.now();
  });
}

/**
 * Updates the form content (Plate editor value).
 */
export async function updateContent(id: string, content: Value) {
  return editorDocCollection.update(id, (draft) => {
    draft.content = content;
    draft.updatedAt = Date.now();
  });
}

/**
 * Updates the form header fields (title, icon, cover).
 */
export async function updateHeader(
  id: string,
  header: { title?: string; icon?: string; cover?: string }
) {
  return editorDocCollection.update(id, (draft) => {
    if (header.title !== undefined) draft.title = header.title;
    if (header.icon !== undefined) draft.icon = header.icon;
    if (header.cover !== undefined) draft.cover = header.cover;
    draft.updatedAt = Date.now();
  });
}

/**
 * Updates general form settings.
 */
export async function updateSettings(id: string, settings: any) {
  return editorDocCollection.update(id, (draft) => {
    draft.settings = { ...draft.settings, ...settings };
    draft.updatedAt = Date.now();
  });
}

/**
 * Generic update for when we need to batch multiple changes.
 */
export async function updateDoc(id: string, updater: (draft: any) => void) {
  return editorDocCollection.update(id, (draft) => {
    updater(draft);
    draft.updatedAt = Date.now();
  });
}
