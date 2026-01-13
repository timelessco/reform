import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useWorkspaceInit } from "@/hooks/use-workspace-init";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
	ssr: false,
});

function DashboardPage() {
	const navigate = useNavigate();
	const { defaultWorkspace, isReady } = useWorkspaceInit();

	useEffect(() => {
		if (isReady && defaultWorkspace) {
			navigate({
				to: "/workspace/$workspaceId",
				params: { workspaceId: defaultWorkspace.id },
				replace: true,
			});
		}
	}, [isReady, defaultWorkspace, navigate]);

	return (
		<div className="flex-1 flex items-center justify-center min-h-screen">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Loading workspace...</p>
			</div>
		</div>
	);
}
