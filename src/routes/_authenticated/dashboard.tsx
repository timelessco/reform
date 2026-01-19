import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getWorkspaces, createWorkspace } from "@/lib/fn/workspaces";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
	ssr: false,
});

function DashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// Query workspaces from server
	const { data: workspacesResponse, isLoading } = useQuery({
		queryKey: ["workspaces"],
		queryFn: () => getWorkspaces(),
	});

	const workspaces = workspacesResponse?.workspaces || [];
	const defaultWorkspace = workspaces.length > 0 ? workspaces[0] : null;

	useEffect(() => {
		const initializeWorkspace = async () => {
			if (isLoading) return;

			if (defaultWorkspace) {
				// Navigate to existing workspace
				navigate({
					to: "/workspace/$workspaceId",
					params: { workspaceId: defaultWorkspace.id },
					replace: true,
				});
			} else {
				// Create default workspace if none exists
				try {
					const response = await createWorkspace({
						data: { name: "My workspace" },
					});
					await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
					navigate({
						to: "/workspace/$workspaceId",
						params: { workspaceId: response.workspace.id },
						replace: true,
					});
				} catch (error) {
					console.error("Failed to create default workspace:", error);
				}
			}
		};

		initializeWorkspace();
	}, [isLoading, defaultWorkspace, navigate, queryClient]);

	return (
		<div className="flex-1 flex items-center justify-center min-h-screen">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Loading workspace...</p>
			</div>
		</div>
	);
}
