import { createIsomorphicFn } from "@tanstack/react-start";
import { normalizeNodeId } from "platejs";
import type { Form } from "@/db-collections";
import { useForm, useForms } from "./use-live-hooks";

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

export const DEFAULT_FORM_STATE: Omit<
	Form,
	"id" | "workspaceId" | "createdAt" | "updatedAt"
> = {
	formName: "draft",
	schemaName: "draftFormSchema",
	isMultiStep: false,
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
	icon: null,
	cover: null,
	status: "draft",
};

export type FormState = Form;

/**
 * useFormState - A hook to access the current form builder state.
 * Uses TanStack DB live query to stay in sync with the persistent store.
 * Works isomorphically (Server/Client) via TanStack Start.
 */
const useFormState = createIsomorphicFn()
	.server((): FormState => {
		const now = new Date().toISOString();
		return {
			...DEFAULT_FORM_STATE,
			id: "main-document",
			workspaceId: "",
			createdAt: now,
			updatedAt: now,
		} as FormState;
	})
	.client((): FormState => {
		// Note: This fetches the first available form document.
		// In a multi-persistent-form app, you'd add a .where() clause.
		const { data } = useForms();

		const now = new Date().toISOString();
		return (
			(data?.[0] as FormState) ||
			({
				...DEFAULT_FORM_STATE,
				id: "main-document",
				workspaceId: "",
				createdAt: now,
				updatedAt: now,
			} as FormState)
		);
	});

export default useFormState;

/**
 * useFormStateById - A hook to access a specific form by ID.
 * Uses TanStack DB live query to stay in sync with the persistent store.
 */
export function useFormStateById(formId?: string): FormState {
	const { data } = useForm(formId);

	const now = new Date().toISOString();
	return (
		(data?.[0] as FormState) ||
		({
			...DEFAULT_FORM_STATE,
			id: formId || "new-form",
			workspaceId: "",
			createdAt: now,
			updatedAt: now,
		} as FormState)
	);
}
