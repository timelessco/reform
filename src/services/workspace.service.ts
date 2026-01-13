import {
	type Workspace,
	editorDocCollection,
	workspaceCollection,
} from "@/db-collections";

/**
 * Creates a new workspace with the given name.
 */
export async function createWorkspace(name = "My workspace"): Promise<Workspace> {
	const id = crypto.randomUUID();
	const now = Date.now();
	const newWorkspace: Workspace = {
		id,
		name,
		createdAt: now,
		updatedAt: now,
	};

	await workspaceCollection.insert(newWorkspace);
	return newWorkspace;
}

/**
 * Updates a workspace's properties.
 */
export async function updateWorkspace(
	id: string,
	updates: Partial<Pick<Workspace, "name">>,
): Promise<void> {
	await workspaceCollection.update(id, (draft) => {
		if (updates.name !== undefined) draft.name = updates.name;
		draft.updatedAt = Date.now();
	});
}

/**
 * Deletes a workspace and all its forms.
 */
export async function deleteWorkspace(id: string): Promise<void> {
	// First, delete all forms in this workspace
	const forms = await editorDocCollection.getAll();
	const formsInWorkspace = forms.filter((form) => form.workspaceId === id);

	for (const form of formsInWorkspace) {
		await editorDocCollection.delete(form.id);
	}

	// Then delete the workspace
	await workspaceCollection.delete(id);
}

/**
 * Gets all workspaces sorted by creation date (oldest first).
 */
export async function getAllWorkspaces(): Promise<Workspace[]> {
	const workspaces = await workspaceCollection.getAll();
	return workspaces.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Gets a workspace by ID.
 */
export async function getWorkspaceById(id: string): Promise<Workspace | undefined> {
	return workspaceCollection.get(id);
}

/**
 * Gets or creates the default workspace.
 * If no workspaces exist, creates "My workspace".
 * Returns the first (oldest) workspace.
 */
export async function getDefaultWorkspace(): Promise<Workspace> {
	const workspaces = await getAllWorkspaces();

	if (workspaces.length === 0) {
		// Create default workspace
		return createWorkspace("My workspace");
	}

	// Return the first (oldest) workspace
	return workspaces[0];
}

/**
 * Migrates orphan forms (without workspaceId) to a target workspace.
 */
export async function migrateOrphanForms(targetWorkspaceId: string): Promise<number> {
	const forms = await editorDocCollection.getAll();
	const orphanForms = forms.filter(
		(form) => !form.workspaceId || form.workspaceId === "",
	);

	for (const form of orphanForms) {
		await editorDocCollection.update(form.id, (draft) => {
			draft.workspaceId = targetWorkspaceId;
			draft.updatedAt = Date.now();
		});
	}

	return orphanForms.length;
}
