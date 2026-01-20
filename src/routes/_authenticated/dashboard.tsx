import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createWorkspaceLocal } from "@/db-collections";
import { useWorkspaces } from "@/hooks/use-live-hooks";
import { authClient, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
	ssr: false,
});

function DashboardPage() {
	const navigate = useNavigate();
	const hasInitialized = useRef(false);

	// Get current session/user
	const { data: session } = useSession();

	// Get active organization and list of user's organizations
	const { data: activeOrg, isPending: isOrgLoading } = authClient.useActiveOrganization();
	const { data: orgsData, isPending: isOrgsListLoading } = authClient.useListOrganizations();

	// Use live query for real-time sync
	const workspaces = useWorkspaces();

	// Collection data starts as undefined, then becomes an array
	const isLoading = workspaces === undefined || isOrgLoading || isOrgsListLoading;
	const defaultWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null;

	useEffect(() => {
		const initializeWorkspace = async () => {
			if (isLoading || hasInitialized.current || !session?.user) return;

			// If user has organizations but no active one, set the first one as active
			if (!activeOrg && orgsData && orgsData.length > 0) {
				await authClient.organization.setActive({ organizationId: orgsData[0].id });
				return; // Will re-run effect after activeOrg updates
			}

			// If user has no organizations at all, create one for them
			if (!activeOrg && orgsData && orgsData.length === 0) {
				hasInitialized.current = true;
				try {
					const orgName = session.user.name ? `${session.user.name}'s Organization` : "My Organization";
					const newOrg = await authClient.organization.create({
						name: orgName,
						slug: `org-${session.user.id.slice(0, 8)}-${Date.now()}`,
					});
					if (newOrg.data) {
						await authClient.organization.setActive({ organizationId: newOrg.data.id });
					}
				} catch (error) {
					console.error("Failed to create organization:", error);
				}
				return;
			}

			if (!activeOrg) return;

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
					const newWorkspace = await createWorkspaceLocal(activeOrg.id, "My workspace");
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
	}, [isLoading, defaultWorkspace, workspaces, navigate, activeOrg, orgsData, session]);

	return (
		<div className="flex-1 flex items-center justify-center min-h-screen">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Loading workspace...</p>
			</div>
		</div>
	);
}
