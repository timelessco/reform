import { WorkspaceZod } from "@/db/schema";
import { createForm, deleteForm, updateForm } from "@/lib/fn/forms";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection, localStorageCollectionOptions } from "@tanstack/react-db";
import { z } from "zod";

// Helper to transform timestamp strings from Electric
const timestampField = z
	.string()
	.transform((val) => new Date(val).toISOString());

// ============================================================================
// Workspace Schema (extends DB schema with timestamp transforms)
// ============================================================================

export const WorkspaceSchema = WorkspaceZod.extend({
	createdAt: timestampField,
	updatedAt: timestampField,
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

// ============================================================================
// Form Builder Settings Schema
// ============================================================================

export const SettingsSchema = z.object({
	defaultRequiredValidation: z.boolean().default(true),
	numericInput: z.boolean().default(false),
	focusOnError: z.boolean().default(true),
	validationMethod: z
		.enum(["onChange", "onBlur", "onDynamic"])
		.default("onDynamic"),
	asyncValidation: z.number().min(0).max(10000).default(500),
	activeTab: z
		.enum(["builder", "template", "settings", "generate"])
		.default("builder"),
	preferredSchema: z.enum(["zod", "valibot", "arktype"]).default("zod"),
	preferredFramework: z
		.enum(["react", "vue", "angular", "solid"])
		.default("react"),
	preferredPackageManager: z
		.enum(["pnpm", "npm", "yarn", "bun"])
		.default("pnpm"),
	isCodeSidebarOpen: z.boolean().default(false),
});

export type FormBuilderSettings = z.infer<typeof SettingsSchema>;

// ============================================================================
// Form Schema
// NOTE: This schema matches the server's expected input types.
// The server injects userId from auth context, so it's optional here.
// This mirrors the structure in src/db/schema.ts for local-first operations.
// ============================================================================

export const FormSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().optional(), // Injected by server
	workspaceId: z.string().uuid(),
	title: z.string().default("Untitled"),
	formName: z.string().default("draft"),
	schemaName: z.string().default("draftFormSchema"),
	content: z.array(z.any()).default([]),
	settings:  z.object({
		defaultRequiredValidation: z.boolean().default(true),
		numericInput: z.boolean().default(false),
		focusOnError: z.boolean().default(true),
		validationMethod: z
			.enum(["onChange", "onBlur", "onDynamic"])
			.default("onDynamic"),
		asyncValidation: z.number().min(0).max(10000).default(500),
		activeTab: z
			.enum(["builder", "template", "settings", "generate"])
			.default("builder"),
		preferredSchema: z.enum(["zod", "valibot", "arktype"]).default("zod"),
		preferredFramework: z
			.enum(["react", "vue", "angular", "solid"])
			.default("react"),
		preferredPackageManager: z
			.enum(["pnpm", "npm", "yarn", "bun"])
			.default("pnpm"),
		isCodeSidebarOpen: z.boolean().default(false),
	}).optional(),
	icon: z.string().nullable().optional(),
	cover: z.string().nullable().optional(),
	isMultiStep: z.boolean().default(false),
	status: z.enum(["draft", "published", "archived"]).default("draft"),
	createdAt: timestampField,
	updatedAt: timestampField,
});

export type Form = z.infer<typeof FormSchema>;

// Legacy type alias for backward compatibility
export type EditorDoc = Form;
export const EditorDocSchema = FormSchema;

// ============================================================================
// Electric URL Helper
// ============================================================================

const getElectricUrl = () => {
	if (typeof window !== "undefined") {
		return `${window.location.origin}/api/electric`;
	}
	// Fallback for SSR (shouldn't be used since collections are client-only)
	return process.env.VITE_APP_URL
		? `${process.env.VITE_APP_URL}/api/electric`
		: "http://localhost:3000/api/electric";
};

// ============================================================================
// Collections with ElectricSQL sync
// ============================================================================

// Type for server function responses
type ServerTxResult = { txid: number };

export const formCollection = createCollection(
	electricCollectionOptions({
		id: "forms",
		schema: FormSchema,
		shapeOptions: {
			url: getElectricUrl(),
			params: { table: "forms" },
		},
		getKey: (item) => item.id,

		onInsert: async ({ transaction }) => {
			const newItem = transaction.mutations[0].modified;
			const result = (await createForm({ data: newItem })) as ServerTxResult;
			return { txid: result.txid };
		},

		onUpdate: async ({ transaction }) => {
			const { original, changes } = transaction.mutations[0];
			const result =await updateForm({
				data: { ...changes, id: original.id },
			})
			return { txid: result.txid };
		},

		onDelete: async ({ transaction }) => {
			const deletedItem = transaction.mutations[0].original;
			const result = (await deleteForm({
				data: { id: deletedItem.id },
			})) as ServerTxResult;
			return { txid: result.txid };
		},
	}),
);

export const localFormCollection = createCollection(localStorageCollectionOptions({
	id: 'draft-form',
    storageKey: 'draft-form',
	schema  : FormSchema,
    getKey: (item) => item.id,
}
))

// Legacy export alias for backward compatibility
export const editorDocCollection = formCollection;
