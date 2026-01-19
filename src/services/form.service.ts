import type { Value } from "platejs";
import { type EditorDoc, editorDocCollection } from "@/db-collections";
import { DEFAULT_FORM_STATE } from "@/hooks/use-form-state";

export async function togglePreview(id: string, currentIsPreview: boolean) {
	return editorDocCollection.update(id, (draft: any) => {
		draft.isPreview = !currentIsPreview;
		draft.updatedAt = new Date();
	});
}

export async function updateContent(id: string, content: Value) {
	return editorDocCollection.update(id, (draft: any) => {
		draft.content = content;
		draft.updatedAt = new Date();
	});
}

export async function updateHeader(
	id: string,
	header: { title?: string; icon?: string; cover?: string },
) {
	return editorDocCollection.update(id, (draft: any) => {
		if (header.title !== undefined) draft.title = header.title;
		if (header.icon !== undefined) draft.icon = header.icon;
		if (header.cover !== undefined) draft.cover = header.cover;
		draft.updatedAt = new Date();
	});
}

export async function updateSettings(id: string, settings: any) {
	return editorDocCollection.update(id, (draft: any) => {
		draft.settings = { ...draft.settings, ...settings };
		draft.updatedAt = new Date();
	});
}

export async function updateDoc(id: string, updater: (draft: any) => void) {
	return editorDocCollection.update(id, (draft: any) => {
		updater(draft);
		draft.updatedAt = new Date();
	});
}

export async function createForm(
	workspaceId: string,
	title = "Untitled",
): Promise<EditorDoc> {
	const id = crypto.randomUUID();
	const newForm: EditorDoc = {
		...DEFAULT_FORM_STATE,
		id,
		workspaceId,
		title,
		updatedAt: new Date(),
	};

	await editorDocCollection.insert(newForm as any);
	return newForm;
}

export async function deleteForm(id: string): Promise<void> {
	await editorDocCollection.delete(id);
}

export async function duplicateForm(sourceForm: EditorDoc): Promise<EditorDoc> {
	const id = crypto.randomUUID();
	const title = sourceForm.title ? `${sourceForm.title} copy` : "Untitled copy";

	const newForm: EditorDoc = {
		...sourceForm,
		id,
		title,
		updatedAt: new Date(),
	};

	await editorDocCollection.insert(newForm as any);
	return newForm;
}

export async function moveFormToWorkspace(
	formId: string,
	targetWorkspaceId: string,
): Promise<void> {
	await editorDocCollection.update(formId, (draft: any) => {
		draft.workspaceId = targetWorkspaceId;
		draft.updatedAt = new Date();
	});
}
