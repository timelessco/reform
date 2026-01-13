import { useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { type Workspace, workspaceCollection } from "@/db-collections";
import {
	createWorkspace,
	getDefaultWorkspace,
	migrateOrphanForms,
} from "@/services/workspace.service";

interface UseWorkspaceInitResult {
	defaultWorkspace: Workspace | null;
	isInitializing: boolean;
	isReady: boolean;
}

/**
 * Hook to initialize workspaces and migrate orphan forms.
 * This should be called at the app level to ensure workspaces are set up.
 */
export function useWorkspaceInit(): UseWorkspaceInitResult {
	const [isInitializing, setIsInitializing] = useState(true);
	const [defaultWorkspace, setDefaultWorkspace] = useState<Workspace | null>(null);

	// Query workspaces to reactively update when they change
	const { data: workspaces = [] } = useLiveQuery((q) =>
		q.from({ workspace: workspaceCollection }).select(({ workspace }) => ({
			id: workspace.id,
			name: workspace.name,
			createdAt: workspace.createdAt,
			updatedAt: workspace.updatedAt,
		})),
	);

	useEffect(() => {
		async function initializeWorkspaces() {
			try {
				// Get or create the default workspace
				const workspace = await getDefaultWorkspace();
				setDefaultWorkspace(workspace);

				// Migrate any orphan forms (forms without workspaceId)
				const migratedCount = await migrateOrphanForms(workspace.id);
				if (migratedCount > 0) {
					console.log(`Migrated ${migratedCount} orphan forms to workspace "${workspace.name}"`);
				}
			} catch (error) {
				console.error("Failed to initialize workspaces:", error);
			} finally {
				setIsInitializing(false);
			}
		}

		initializeWorkspaces();
	}, []);

	// Update default workspace when workspaces change
	useEffect(() => {
		if (workspaces.length > 0 && !isInitializing) {
			// Sort by createdAt and get the first one
			const sorted = [...workspaces].sort((a, b) => a.createdAt - b.createdAt);
			setDefaultWorkspace(sorted[0]);
		}
	}, [workspaces, isInitializing]);

	return {
		defaultWorkspace,
		isInitializing,
		isReady: !isInitializing && defaultWorkspace !== null,
	};
}

/**
 * Hook to get all workspaces sorted by creation date.
 */
export function useWorkspaces() {
	const { data: workspaces = [] } = useLiveQuery((q) =>
		q.from({ workspace: workspaceCollection }).select(({ workspace }) => ({
			id: workspace.id,
			name: workspace.name,
			createdAt: workspace.createdAt,
			updatedAt: workspace.updatedAt,
		})),
	);

	// Sort by createdAt (oldest first)
	return [...workspaces].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Hook to get a specific workspace by ID.
 */
export function useWorkspaceById(workspaceId: string) {
	const { data: workspaces = [] } = useLiveQuery((q) =>
		q.from({ workspace: workspaceCollection }).select(({ workspace }) => ({
			id: workspace.id,
			name: workspace.name,
			createdAt: workspace.createdAt,
			updatedAt: workspace.updatedAt,
		})),
	);

	return workspaces.find((w) => w.id === workspaceId) || null;
}
