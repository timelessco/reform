import {
	createCollection,
	localStorageCollectionOptions,
} from "@tanstack/react-db";
import { z } from "zod";

// ============================================================================
// Workspace Schema
// ============================================================================

export const WorkspaceSchema = z.object({
	id: z.string(),
	name: z.string().default("My workspace"),
	createdAt: z.number(),
	updatedAt: z.number(),
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
// Main Form Builder Schema (EditorDoc)
// ============================================================================

export const EditorDocSchema = z.object({
	// Identifiers
	id: z.string(),
	workspaceId: z.string(), // Foreign key to Workspace
	formName: z.string().default("draft"),
	schemaName: z.string().default("draftFormSchema"),

	// Plate Editor Content
	// This represents the form elements. Each element in the editor (Input, Checkbox, etc.)
	// is a node in this array.
	content: z.array(z.any()),

	// UI State & Settings
	isMS: z.boolean().default(false), // Multi-step form flag
	isPreview: z.boolean().default(false), // Preview mode flag
	settings: SettingsSchema.default({
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
	}),
	lastAddedStepIndex: z.number().optional(),
	generatedCommandUrl: z.string().optional(),

	// Notion-style Header
	title: z.string().optional(),
	icon: z.string().optional(), // URL or emoji char
	cover: z.string().optional(), // URL

	// Metadata
	updatedAt: z.number(),
});

export type EditorDoc = z.infer<typeof EditorDocSchema>;

// ============================================================================
// Saved Form Templates Schema
// ============================================================================

export const SavedFormTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	data: EditorDocSchema,
	createdAt: z.string(),
	generatedCommandUrl: z.string().optional(),
});

export type SavedFormTemplate = z.infer<typeof SavedFormTemplateSchema>;

// ============================================================================
// Collections
// ============================================================================

// Create collection based on environment
// Server: use localStorage options (has built-in memory fallback for SSR)
// Client: use Dexie/IndexedDB for persistence (better capacity than localStorage)

// NOTE: We use dynamic import() for dexie to avoid loading it during SSR.
// Dexie requires IndexedDB which is browser-only.

// Helper to load dexie collection options (client-only)
async function loadDexieOptions() {
	const { dexieCollectionOptions } = await import("tanstack-dexie-db-collection");
	return dexieCollectionOptions;
}

// Cached dexie options (loaded once on client)
let dexieOptionsPromise: ReturnType<typeof loadDexieOptions> | null = null;

function getDexieOptions() {
	if (!dexieOptionsPromise) {
		dexieOptionsPromise = loadDexieOptions();
	}
	return dexieOptionsPromise;
}

// Create collections - uses localStorage for SSR, dexie for client
async function createEditorDocCollectionAsync() {
	if (typeof window !== "undefined") {
		const dexieCollectionOptions = await getDexieOptions();
		return createCollection(
			dexieCollectionOptions({
				id: "editor-documents",
				schema: EditorDocSchema,
				getKey: (doc: EditorDoc) => doc.id,
				dbName: "better-forms-db",
				tableName: "forms",
			}),
		);
	}
	return createCollection(
		localStorageCollectionOptions({
			storageKey: "editor-documents-ssr",
			schema: EditorDocSchema,
			getKey: (doc: EditorDoc) => doc.id,
		}),
	);
}

async function createWorkspaceCollectionAsync() {
	if (typeof window !== "undefined") {
		const dexieCollectionOptions = await getDexieOptions();
		return createCollection(
			dexieCollectionOptions({
				id: "workspaces",
				schema: WorkspaceSchema,
				getKey: (workspace: Workspace) => workspace.id,
				dbName: "better-forms-db",
				tableName: "workspaces",
			}),
		);
	}
	return createCollection(
		localStorageCollectionOptions({
			storageKey: "workspaces-ssr",
			schema: WorkspaceSchema,
			getKey: (workspace: Workspace) => workspace.id,
		}),
	);
}

// Use top-level await to initialize collections
// This is supported by Vite and modern bundlers
export const editorDocCollection = await createEditorDocCollectionAsync();
export const workspaceCollection = await createWorkspaceCollectionAsync();
