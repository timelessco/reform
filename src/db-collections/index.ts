import { PGlite } from "@electric-sql/pglite";
import {
	createCollection,
	localStorageCollectionOptions,
} from "@tanstack/react-db";
import {
	forms as formsTable,
	workspaces as workspacesTable,
} from "drizzle/schema";
import { drizzle } from "drizzle-orm/pglite";
import { z } from "zod";
import { waitForMigrations } from "@/lib/pglite";

const pglite = new PGlite();
const db = drizzle({
	connection: pglite,
});

export const WorkspaceSchema = z.object({
	id: z.string(),
	name: z.string().default("My workspace"),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

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

export const EditorDocSchema = z.object({
	id: z.string(),
	workspaceId: z.string(),
	formName: z.string().default("draft"),
	schemaName: z.string().default("draftFormSchema"),
	content: z.array(z.any()),
	isMultiStep: z.boolean().default(false),
	status: z.string().default("draft"),
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
	title: z.string().optional(),
	icon: z.string().nullable().optional(),
	cover: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	createdAt: z.coerce.date().optional(),
	updatedAt: z.coerce.date(),
});

export type EditorDoc = z.infer<typeof EditorDocSchema>;

export const SavedFormTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	data: EditorDocSchema,
	createdAt: z.string(),
	generatedCommandUrl: z.string().optional(),
});

export type SavedFormTemplate = z.infer<typeof SavedFormTemplateSchema>;

async function pgLiteOptions() {
	const { drizzleCollectionOptions } = await import("tanstack-db-pglite");
	return drizzleCollectionOptions;
}

let pgLiteOptionsPromise: ReturnType<typeof pgLiteOptions> | null = null;

function getPgLiteOptions() {
	if (!pgLiteOptionsPromise) {
		pgLiteOptionsPromise = pgLiteOptions();
	}
	return pgLiteOptionsPromise;
}

function getAuthToken(): string | null {
	if (typeof window === "undefined") return null;
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (name === "better-auth.session_token") {
			return value;
		}
	}
	return null;
}

let workspaceSyncResolvers: {
	promise: Promise<void>;
	resolve: () => void;
} | null = null;

export async function waitForWorkspacesSync() {
	if (workspaceSyncResolvers) {
		await workspaceSyncResolvers.promise;
	}
}

async function createEditorDocCollectionAsync() {
	if (typeof window !== "undefined") {
		const pgLiteCollectionOptions = await getPgLiteOptions();
		const { client } = await import("@/orpc/client");

		return createCollection(
			pgLiteCollectionOptions({
				db: db,
				table: formsTable,
				primaryColumn: formsTable.id,
				startSync: false,
				prepare: async () => {
					await waitForMigrations();
				},
				sync: async ({
					collection,
					write,
				}: {
					collection: any;
					write: any;
				}) => {
					if (!getAuthToken() || !navigator.onLine) {
						return;
					}

					await waitForWorkspacesSync();

					const syncResult = await client.syncForms(
						collection.toArray.map((c: any) => ({
							id: c.id,
							updatedAt: new Date(c.updatedAt),
						})),
					);

					for (const item of syncResult) {
						if (item.type === "delete") {
							const existing = collection.get(item.value);
							if (existing) {
								write({ type: "delete", value: existing });
							}
						} else {
							write(item as any);
						}
					}
				},
				onInsert: async ({ transaction }: { transaction: any }) => {
					if (!getAuthToken()) return;

					const formsByWorkspace = new Map<string, any[]>();
					for (const m of transaction.mutations) {
						const wsId = m.modified.workspaceId;
						if (!formsByWorkspace.has(wsId)) {
							formsByWorkspace.set(wsId, []);
						}
						formsByWorkspace.get(wsId)!.push(m);
					}

					for (const [workspaceId, mutations] of formsByWorkspace) {
						await client.bulkInsertForms({
							workspaceId,
							forms: mutations.map((m: any) => ({
								id: m.modified.id,
								workspaceId,
								title: m.modified.title,
								formName: m.modified.formName,
								schemaName: m.modified.schemaName,
								content: m.modified.content as any[],
								settings: m.modified.settings as any,
								icon: m.modified.icon,
								cover: m.modified.cover,
								isMultiStep: m.modified.isMultiStep,
							})),
						});
					}
				},
				onUpdate: async ({ transaction }: { transaction: any }) => {
					if (!getAuthToken()) return;

					await Promise.all(
						transaction.mutations.map((m: any) =>
							client.updateForm({
								id: m.key as string,
								...m.changes,
							}),
						),
					);
				},
				onDelete: async ({ transaction }: { transaction: any }) => {
					if (!getAuthToken()) return;

					await client.removeForms(
						transaction.mutations.map((m: any) => ({ id: m.key as string })),
					);
				},
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
		const pgLiteCollectionOptions = await getPgLiteOptions();
		const { client } = await import("@/orpc/client");

		return createCollection(
			pgLiteCollectionOptions({
				db: db,
				table: workspacesTable,
				primaryColumn: workspacesTable.id,
				startSync: false,
				prepare: async () => {
					await waitForMigrations();
				},
				sync: async ({
					collection,
					write,
				}: {
					collection: any;
					write: any;
				}) => {
					if (!getAuthToken() || !navigator.onLine) {
						return;
					}

					workspaceSyncResolvers = (() => {
						let resolve: () => void;
						const promise = new Promise<void>((r) => {
							resolve = r;
						});
						return { promise, resolve: resolve! };
					})();

					const syncResult = await client.syncWorkspaces(
						collection.toArray.map((c: any) => ({
							id: c.id,
							updatedAt: new Date(c.updatedAt),
						})),
					);

					for (const item of syncResult) {
						if (item.type === "delete") {
							const existing = collection.get(item.value);
							if (existing) {
								write({ type: "delete", value: existing });
							}
						} else {
							write(item as any);
						}
					}

					workspaceSyncResolvers.resolve();
				},
				onInsert: async ({ transaction }: { transaction: any }) => {
					if (!getAuthToken()) return;

					for (const m of transaction.mutations) {
						await client.createWorkspace({
							id: m.modified.id,
							name: m.modified.name,
						});
					}
				},
				onUpdate: async ({ transaction }: { transaction: any }) => {
					if (!getAuthToken()) return;

					await Promise.all(
						transaction.mutations.map((m: any) =>
							client.updateWorkspace({
								id: m.key as string,
								name: m.changes.name,
							}),
						),
					);
				},
				onDelete: async ({ transaction }: { transaction: any }) => {
					if (!getAuthToken()) return;

					await client.removeWorkspaces(
						transaction.mutations.map((m: any) => ({ id: m.key as string })),
					);
				},
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

export const editorDocCollection = await createEditorDocCollectionAsync();
export const workspaceCollection = await createWorkspaceCollectionAsync();
