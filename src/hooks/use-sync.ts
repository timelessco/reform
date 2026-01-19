import type { MutationOptions } from "@tanstack/react-query";
import { useIsMutating, useMutation } from "@tanstack/react-query";
import { editorDocCollection, workspaceCollection } from "@/db-collections";

const syncFormsMutationOptions = {
	mutationKey: ["sync-forms"],
	mutationFn: () => editorDocCollection.utils.runSync(),
} satisfies MutationOptions;

export function useFormsSync() {
	const { mutate, mutateAsync } = useMutation(syncFormsMutationOptions);

	return {
		sync: mutate,
		syncAsync: mutateAsync,
		isSyncing:
			useIsMutating({ mutationKey: syncFormsMutationOptions.mutationKey }) > 0,
	};
}

const syncWorkspacesMutationOptions = {
	mutationKey: ["sync-workspaces"],
	mutationFn: () => workspaceCollection.utils.runSync(),
} satisfies MutationOptions;

export function useWorkspacesSync() {
	const { mutate, mutateAsync } = useMutation(syncWorkspacesMutationOptions);

	return {
		sync: mutate,
		syncAsync: mutateAsync,
		isSyncing:
			useIsMutating({
				mutationKey: syncWorkspacesMutationOptions.mutationKey,
			}) > 0,
	};
}

export function useSync() {
	const forms = useFormsSync();
	const workspaces = useWorkspacesSync();

	const syncAll = async () => {
		await workspaces.syncAsync();
		await forms.syncAsync();
	};

	return {
		forms,
		workspaces,
		syncAll,
		isSyncing: forms.isSyncing || workspaces.isSyncing,
	};
}
