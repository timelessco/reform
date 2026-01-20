import type { Value } from "platejs";
import { type Form, formCollection } from "@/db-collections";
import { createFormHeaderNode } from "@/components/ui/form-header-node";
import { logger } from "@/lib/utils";

const DEFAULT_FORM_CONTENT = [
	createFormHeaderNode({ title: "Untitled", icon: null, cover: null }),
	{
		children: [{ text: "Start building your form..." }],
		type: "p",
	},
];

const DEFAULT_FORM_SETTINGS = {
	defaultRequiredValidation: true,
	numericInput: false,
	focusOnError: true,
	validationMethod: "onDynamic" as const,
	asyncValidation: 500,
	activeTab: "builder" as const,
	preferredSchema: "zod" as const,
	preferredFramework: "react" as const,
	preferredPackageManager: "pnpm" as const,
	isCodeSidebarOpen: false,
};

/**
 * Updates the form content (Plate editor value).
 */
export async function updateContent(id: string, content: Value) {
	return formCollection.update(id, (draft) => {
		draft.content = content;
		draft.updatedAt = new Date().toISOString();
	});
}

/**
 * Updates the form header fields (title, icon, cover).
 */
export async function updateHeader(
	id: string,
	header: { title?: string; icon?: string; cover?: string , workspaceId : string ,createdAt : string},
) {
	return formCollection.update(id, (draft) => {
		if (header.title !== undefined) draft.title = header.title;
		if (header.icon !== undefined) draft.icon = header.icon;
		if (header.cover !== undefined) draft.cover = header.cover;
		if(header.workspaceId !== undefined) draft.workspaceId = header.workspaceId;
		if(header.createdAt !== undefined) draft.createdAt = header.createdAt;
		draft.updatedAt = new Date().toISOString();
	});
}

/**
 * Updates general form settings.
 */
export async function updateSettings(
	id: string,
	settings: Partial<typeof DEFAULT_FORM_SETTINGS>,
) {
	return formCollection.update(id, (draft) => {
		draft.settings = { ...draft.settings, ...settings };
		draft.updatedAt = new Date().toISOString();
	});
}

/**
 * Generic update for when we need to batch multiple changes.
 */
export async function updateDoc(
	id: string,
	updater: (draft: any) => void,
) {
	return formCollection.update(id, (draft) => {
		logger(draft, 'draft')
		updater(draft);
		draft.updatedAt = new Date().toISOString();
	});
}

/**
 * Creates a new form with default values and returns the new document.
 */
export async function createForm(
	workspaceId: string,
	title = "Untitled",
): Promise<Form> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const newForm: Form = {
		id,
		workspaceId,
		title,
		formName: "draft",
		schemaName: "draftFormSchema",
		content: DEFAULT_FORM_CONTENT,
		settings: DEFAULT_FORM_SETTINGS,
		icon: null,
		cover: null,
		isMultiStep: false,
		status: "draft",
		createdAt: now,
		updatedAt: now,
	};

	await formCollection.insert(newForm);
	return newForm;
}

/**
 * Deletes a form by ID.
 */
export async function deleteForm(id: string): Promise<void> {
	await formCollection.delete(id);
}

/**
 * Duplicates a form by ID and returns the new document.
 * The new form's title will be "{original title} copy"
 */
export async function duplicateForm(sourceForm: Form): Promise<Form> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const title = sourceForm.title
		? `${sourceForm.title} copy`
		: "Untitled copy";

	const newForm: Form = {
		...sourceForm,
		id,
		title,
		createdAt: now,
		updatedAt: now,
	};

	await formCollection.insert(newForm);
	return newForm;
}

/**
 * Moves a form to a different workspace.
 */
export async function moveFormToWorkspace(
	formId: string,
	targetWorkspaceId: string,
): Promise<void> {
	await formCollection.update(formId, (draft) => {
		draft.workspaceId = targetWorkspaceId;
		draft.updatedAt = new Date().toISOString();
	});
}
