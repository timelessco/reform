import { eq, useLiveQuery } from "@tanstack/react-db";
import { createIsomorphicFn } from "@tanstack/react-start";
import { normalizeNodeId } from "platejs";
import { type EditorDoc, editorDocCollection } from "@/db-collections";

// Standard default content for a new form
const defaultContent = normalizeNodeId([
	{
		children: [{ text: "My New Form" }],
		type: "h1",
	},
	{
		children: [{ text: "" }],
		type: "p",
	},
]);

export const DEFAULT_FORM_STATE: Omit<EditorDoc, "id" | "updatedAt"> = {
	formName: "draft",
	schemaName: "draftFormSchema",
	isMS: false,
	isPreview: false,
	content: defaultContent,
	settings: {
		defaultRequiredValidation: true,
		numericInput: false,
		focusOnError: true,
		validationMethod: "onDynamic",
		asyncValidation: 500,
		activeTab: "builder",
		preferredSchema: "zod",
		preferredFramework: "react",
		preferredPackageManager: "pnpm",
		isCodeSidebarOpen: false,
	},
	title: "",
	icon: undefined,
	cover: undefined,
};

export type FormState = EditorDoc;

/**
 * useFormState - A hook to access the current form builder state.
 * Uses TanStack DB live query to stay in sync with the persistent store.
 * Works isomorphically (Server/Client) via TanStack Start.
 */
const useFormState = createIsomorphicFn()
	.server((): FormState => {
		return {
			...DEFAULT_FORM_STATE,
			id: "main-document",
			updatedAt: Date.now(),
		} as FormState;
	})
	.client((): FormState => {
		// Note: This fetches the first available form document.
		// In a multi-persistent-form app, you'd add a .where() clause.
		const { data } = useLiveQuery((q) =>
			q.from({ doc: editorDocCollection }).select(({ doc }) => ({
				id: doc.id,
				formName: doc.formName,
				schemaName: doc.schemaName,
				isMS: doc.isMS,
				isPreview: doc.isPreview,
				content: doc.content,
				settings: doc.settings,
				lastAddedStepIndex: doc.lastAddedStepIndex,
				generatedCommandUrl: doc.generatedCommandUrl,
				title: doc.title,
				icon: doc.icon,
				cover: doc.cover,
				updatedAt: doc.updatedAt,
			})),
		);

		return (
			(data?.[0] as FormState) ||
			({
				...DEFAULT_FORM_STATE,
				id: "main-document",
				updatedAt: Date.now(),
			} as FormState)
		);
	});

export default useFormState;

/**
 * useFormStateById - A hook to access a specific form by ID.
 * Uses TanStack DB live query to stay in sync with the persistent store.
 */
export function useFormStateById(formId?: string): FormState {
	const { data } = useLiveQuery((q) => {
		let query = q.from({ doc: editorDocCollection });
		if (formId) {
			query = query.where(({ doc }) => eq(doc.id, formId));
		}
		return query.select(({ doc }) => ({
			id: doc.id,
			formName: doc.formName,
			schemaName: doc.schemaName,
			isMS: doc.isMS,
			isPreview: doc.isPreview,
			content: doc.content,
			settings: doc.settings,
			lastAddedStepIndex: doc.lastAddedStepIndex,
			generatedCommandUrl: doc.generatedCommandUrl,
			title: doc.title,
			icon: doc.icon,
			cover: doc.cover,
			updatedAt: doc.updatedAt,
		}));
	});

	return (
		(data?.[0] as FormState) ||
		({
			...DEFAULT_FORM_STATE,
			id: formId || "new-form",
			updatedAt: Date.now(),
		} as FormState)
	);
}
