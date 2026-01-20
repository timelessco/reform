import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createWorkspaceLocal } from "@/db-collections";
import { useWorkspaces } from "@/hooks/use-live-hooks";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
	ssr: false,
});

function DashboardPage() {
	const navigate = useNavigate();
	const hasInitialized = useRef(false);

	// Use live query for real-time sync
	const workspaces = useWorkspaces();

	// Collection data starts as undefined, then becomes an array
	const isLoading = workspaces === undefined;
	const defaultWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null;

	useEffect(() => {
		const initializeWorkspace = async () => {
			if (isLoading || hasInitialized.current) return;

			if (defaultWorkspace) {
				hasInitialized.current = true;
				// Navigate to existing workspace
				navigate({
					to: "/workspace/$workspaceId",
					params: { workspaceId: defaultWorkspace.id },
					replace: true,
				});
			} else if (workspaces && workspaces.length === 0) {
				hasInitialized.current = true;
				// Create default workspace if none exists
				try {
					const newWorkspace = await createWorkspaceLocal("My workspace");
					navigate({
						to: "/workspace/$workspaceId",
						params: { workspaceId: newWorkspace.id },
						replace: true,
					});
				} catch (error) {
					console.error("Failed to create default workspace:", error);
				}
			}
		};

		initializeWorkspace();
	}, [isLoading, defaultWorkspace, workspaces, navigate]);

	return (
		<div className="flex-1 flex items-center justify-center min-h-screen">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Loading workspace...</p>
			</div>
		</div>
	);
}
