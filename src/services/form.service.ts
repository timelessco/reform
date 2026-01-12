import type { Value } from "platejs";
import { type EditorDoc, editorDocCollection } from "@/db-collections";
import { DEFAULT_FORM_STATE } from "@/hooks/use-form-state";

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
	header: { title?: string; icon?: string; cover?: string },
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

/**
 * Creates a new form with default values and returns the new document.
 */
export async function createForm(title = "Untitled"): Promise<EditorDoc> {
	const id = crypto.randomUUID();
	const newForm: EditorDoc = {
		...DEFAULT_FORM_STATE,
		id,
		title,
		updatedAt: Date.now(),
	};

	await editorDocCollection.insert(newForm);
	return newForm;
}

/**
 * Deletes a form by ID.
 */
export async function deleteForm(id: string): Promise<void> {
	await editorDocCollection.delete(id);
}

/**
 * Duplicates a form by ID and returns the new document.
 * The new form's title will be "{original title} copy"
 */
export async function duplicateForm(
	sourceForm: EditorDoc,
): Promise<EditorDoc> {
	const id = crypto.randomUUID();
	const title = sourceForm.title
		? `${sourceForm.title} copy`
		: "Untitled copy";

	const newForm: EditorDoc = {
		...sourceForm,
		id,
		title,
		updatedAt: Date.now(),
	};

	await editorDocCollection.insert(newForm);
	return newForm;
}
