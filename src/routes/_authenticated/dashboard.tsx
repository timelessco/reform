import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createWorkspaceLocal } from "@/db-collections";
import { useWorkspaces } from "@/hooks/use-live-hooks";
import { auth, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
	ssr: false,
});

function DashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const hasInitialized = useRef(false);

	// Get current session/user
	const { data: session } = useSession();

	// Get active organization and list of user's organizations
	const { data: activeOrg, isPending: isOrgLoading } = useQuery(
		auth.organization.getFullOrganization.queryOptions(),
	);
	const { data: orgsData, isPending: isOrgsListLoading } = useQuery(
		auth.organization.list.queryOptions(),
	);

	// Use live query for real-time sync
	const workspaces = useWorkspaces();

	// Collection data starts as undefined, then becomes an array
	const isLoading = workspaces === undefined || isOrgLoading || isOrgsListLoading;
	const defaultWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null;

	const setActiveMutation = useMutation(
		auth.organization.setActive.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: auth.organization.getFullOrganization.queryKey(),
				});
			},
		}),
	);

	const createOrgMutation = useMutation(
		auth.organization.create.mutationOptions({
			onSuccess: (data) => {
				if (data) {
					setActiveMutation.mutate({ organizationId: data.id });
				}
			},
			onError: (error) => {
				console.error("Failed to create organization:", error);
			},
		}),
	);

	useEffect(() => {
		const initializeWorkspace = async () => {
			if (isLoading || hasInitialized.current || !session?.user) return;

			// If user has organizations but no active one, set the first one as active
			if (!activeOrg && orgsData && orgsData.length > 0) {
				setActiveMutation.mutate({ organizationId: orgsData[0].id });
				return; // Will re-run effect after activeOrg updates
			}

			// If user has no organizations at all, create one for them
			if (!activeOrg && orgsData && orgsData.length === 0) {
				hasInitialized.current = true;
				const orgName = session.user.name ? `${session.user.name}'s Organization` : "My Organization";
				createOrgMutation.mutate({
					name: orgName,
					slug: `org-${session.user.id.slice(0, 8)}-${Date.now()}`,
				});
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
	}, [isLoading, defaultWorkspace, workspaces, navigate, activeOrg, orgsData, session, setActiveMutation, createOrgMutation]);

	return (
		<div className="flex-1 flex items-center justify-center min-h-screen">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Loading workspace...</p>
			</div>
		</div>
	);
}
