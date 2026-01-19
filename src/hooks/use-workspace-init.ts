import { useEffect, useState, useSyncExternalStore } from "react";
import { type Workspace, workspaceCollection } from "@/db-collections";
import {
	getDefaultWorkspace,
	migrateOrphanForms,
} from "@/services/workspace.service";

// Empty subscribe function for server
const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

/**
 * Hook to detect if we're on the client (after hydration).
 * Returns false during SSR and initial render, true after hydration.
 */
function useIsClient() {
	return useSyncExternalStore(
		emptySubscribe,
		getClientSnapshot,
		getServerSnapshot,
	);
}

interface UseWorkspaceInitResult {
	defaultWorkspace: Workspace | null;
	isInitializing: boolean;
	isReady: boolean;
}

/**
 * Hook to initialize workspaces and migrate orphan forms.
 * This should be called at the app level to ensure workspaces are set up.
 * SSR-safe: returns loading state during SSR.
 */
export function useWorkspaceInit(): UseWorkspaceInitResult {
	const isClient = useIsClient();
	const [isInitializing, setIsInitializing] = useState(true);
	const [defaultWorkspace, setDefaultWorkspace] = useState<Workspace | null>(
		null,
	);
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

	// Initialize workspaces on client only
	useEffect(() => {
		if (!isClient) return;

		async function initializeWorkspaces() {
			try {
				// Get or create the default workspace
				const workspace = await getDefaultWorkspace();
				setDefaultWorkspace(workspace);

				// Migrate any orphan forms (forms without workspaceId)
				const migratedCount = await migrateOrphanForms(workspace.id);
				if (migratedCount > 0) {
					console.log(
						`Migrated ${migratedCount} orphan forms to workspace "${workspace.name}"`,
					);
				}
			} catch (error) {
				console.error("Failed to initialize workspaces:", error);
			} finally {
				setIsInitializing(false);
			}
		}

		initializeWorkspaces();
	}, [isClient]);

	// Subscribe to workspace changes on client only
	useEffect(() => {
		if (!isClient) return;

		let subscription: { unsubscribe: () => void } | undefined;

		async function subscribeToWorkspaces() {
			try {
				const collection = workspaceCollection;

				// Get initial state
				const initialWorkspaces = await collection.toArrayWhenReady();
				const mapped = initialWorkspaces.map((w) => ({
					id: w.id,
					name: w.name,
					createdAt: w.createdAt,
					updatedAt: w.updatedAt,
				}));
				setWorkspaces(mapped);

				// Subscribe to changes
				subscription = collection.subscribeChanges(
					(_changes) => {
						// Re-fetch all workspaces when changes occur
						collection.toArrayWhenReady().then((items) => {
							const mappedItems = items.map((w) => ({
								id: w.id,
								name: w.name,
								createdAt: w.createdAt,
								updatedAt: w.updatedAt,
							}));
							setWorkspaces(mappedItems);
						});
					},
					{ includeInitialState: false },
				);
			} catch (error) {
				console.error("Failed to subscribe to workspaces:", error);
			}
		}

		subscribeToWorkspaces();

		return () => {
			subscription?.unsubscribe();
		};
	}, [isClient]);

	// Update default workspace when workspaces change
	useEffect(() => {
		if (workspaces.length > 0 && !isInitializing) {
			// Sort by createdAt and get the first one
			const sorted = [...workspaces].sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			);
			setDefaultWorkspace(sorted[0]);
		}
	}, [workspaces, isInitializing]);

	return {
		defaultWorkspace,
		isInitializing: !isClient || isInitializing,
		isReady: isClient && !isInitializing && defaultWorkspace !== null,
	};
}

/**
 * Hook to get all workspaces sorted by creation date.
 * SSR-safe: returns empty array during SSR.
 */
export function useWorkspaces(): Workspace[] {
	const isClient = useIsClient();
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

	useEffect(() => {
		if (!isClient) return;

		let subscription: { unsubscribe: () => void } | undefined;

		async function subscribeToWorkspaces() {
			try {
				const collection = workspaceCollection;

				// Get initial state
				const initialWorkspaces = await collection.toArrayWhenReady();
				const mapped = initialWorkspaces.map((w) => ({
					id: w.id,
					name: w.name,
					createdAt: w.createdAt,
					updatedAt: w.updatedAt,
				}));
				// Sort by createdAt (oldest first)
				setWorkspaces(
					mapped.sort(
						(a, b) =>
							new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
					),
				);

				// Subscribe to changes
				subscription = collection.subscribeChanges(
					(_changes) => {
						// Re-fetch all workspaces when changes occur
						collection.toArrayWhenReady().then((items) => {
							const mappedItems = items.map((w) => ({
								id: w.id,
								name: w.name,
								createdAt: w.createdAt,
								updatedAt: w.updatedAt,
							}));
							setWorkspaces(
								mappedItems.sort(
									(a, b) =>
										new Date(a.createdAt).getTime() -
										new Date(b.createdAt).getTime(),
								),
							);
						});
					},
					{ includeInitialState: false },
				);
			} catch (error) {
				console.error("Failed to subscribe to workspaces:", error);
			}
		}

		subscribeToWorkspaces();

		return () => {
			subscription?.unsubscribe();
		};
	}, [isClient]);

	return workspaces;
}

/**
 * Hook to get a specific workspace by ID.
 * SSR-safe: returns null during SSR.
 */
export function useWorkspaceById(workspaceId: string): Workspace | null {
	const workspaces = useWorkspaces();
	return workspaces.find((w) => w.id === workspaceId) || null;
}
