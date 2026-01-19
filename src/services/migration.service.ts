import { ne } from "drizzle-orm";
import { forms, workspaces } from "@/db/schema";
import { clearLocalDb, getLocalDb } from "@/lib/pglite";
import { client } from "@/orpc/client";

interface MigrationResult {
	migratedWorkspaces: number;
	migratedForms: number;
	defaultWorkspaceId: string;
}

async function getLocalWorkspaces() {
	const db = await getLocalDb();
	return db.select().from(workspaces).where(ne(workspaces.id, "draft"));
}

async function getLocalForms() {
	const db = await getLocalDb();
	return db.select().from(forms).where(ne(forms.id, "draft-form"));
}

/**
 * Main migration function - call this when user logs in
 * Migrates local PGlite data to the server
 */
export async function migrateLocalDataToServer(): Promise<MigrationResult> {
	console.log("[Migration] Starting local-to-server migration...");

	// Step 1: Get or create default workspace on server
	const { workspace: defaultWorkspace, created } =
		await client.getOrCreateDefaultWorkspace({});

	console.log(
		`[Migration] Default workspace: ${defaultWorkspace.id} (created: ${created})`,
	);

	// Step 2: Get local forms from PGlite
	const localForms = await getLocalForms();
	console.log(`[Migration] Found ${localForms.length} local forms`);

	if (localForms.length === 0) {
		return {
			migratedWorkspaces: 0,
			migratedForms: 0,
			defaultWorkspaceId: defaultWorkspace.id,
		};
	}

	// Step 3: Get local workspaces from PGlite
	const localWorkspaces = await getLocalWorkspaces();
	console.log(`[Migration] Found ${localWorkspaces.length} local workspaces`);

	// Step 4: Create a mapping from local workspace IDs to server workspace IDs
	const workspaceMapping = new Map<string, string>();
	let migratedWorkspaces = 0;

	for (const localWs of localWorkspaces) {
		try {
			// Create workspace on server with new ID
			const { workspace: serverWs } = await client.createWorkspace({
				id: crypto.randomUUID(),
				name: localWs.name,
			});
			workspaceMapping.set(localWs.id, serverWs.id);
			migratedWorkspaces++;
		} catch (error) {
			console.error(
				`[Migration] Failed to migrate workspace ${localWs.id}:`,
				error,
			);
			// Map failed workspaces to default workspace
			workspaceMapping.set(localWs.id, defaultWorkspace.id);
		}
	}

	// Step 5: Migrate forms to server
	// Group forms by target workspace for bulk insert
	const formsByWorkspace = new Map<string, typeof localForms>();

	for (const form of localForms) {
		// Determine target workspace
		let targetWorkspaceId = defaultWorkspace.id;

		if (form.workspaceId && workspaceMapping.has(form.workspaceId)) {
			targetWorkspaceId = workspaceMapping.get(form.workspaceId)!;
		}

		if (!formsByWorkspace.has(targetWorkspaceId)) {
			formsByWorkspace.set(targetWorkspaceId, []);
		}

		formsByWorkspace.get(targetWorkspaceId)!.push(form);
	}

	// Bulk insert forms per workspace
	let migratedForms = 0;

	for (const [workspaceId, formsToMigrate] of formsByWorkspace) {
		try {
			await client.bulkInsertForms({
				workspaceId,
				forms: formsToMigrate.map((f) => ({
					id: crypto.randomUUID(), // New ID to avoid conflicts
					workspaceId,
					title: f.title || "Untitled",
					formName: f.formName || "draft",
					schemaName: f.schemaName || "draftFormSchema",
					content: (f.content as any[]) || [],
					settings: (f.settings as Record<string, any>) || {},
					icon: f.icon,
					cover: f.cover,
					isMultiStep: f.isMultiStep || false,
				})),
			});
			migratedForms += formsToMigrate.length;
		} catch (error) {
			console.error(
				`[Migration] Failed to migrate forms to workspace ${workspaceId}:`,
				error,
			);
		}
	}

	console.log(`[Migration] Migrated ${migratedForms} forms to server`);

	// Step 6: Clear local PGlite data
	await clearLocalDb();
	console.log("[Migration] Cleared local data after successful migration");

	return {
		migratedWorkspaces,
		migratedForms,
		defaultWorkspaceId: defaultWorkspace.id,
	};
}

export async function checkMigrationNeeded(): Promise<boolean> {
	try {
		const db = await getLocalDb();
		const localForms = await db
			.select()
			.from(forms)
			.where(ne(forms.id, "draft-form"));
		return localForms.length > 0;
	} catch {
		return false;
	}
}

export async function hasServerData(): Promise<boolean> {
	try {
		const serverWorkspaces = await client.listWorkspaces({});
		return serverWorkspaces.length > 0;
	} catch {
		return false;
	}
}
