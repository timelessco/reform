import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { z } from "zod";
import { AppHeader } from "@/components/ui/app-header";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { useForm, useWorkspace } from "@/hooks/use-live-hooks";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { cn } from "@/lib/utils";

// Client-only component for displaying form title from local DB
function _FormTitleDisplay({ formId }: { formId: string }) {
	const { data: savedDocs } = useForm(formId);
	return <>{savedDocs?.[0]?.title || "Untitled Form"}</>;
}

// Client-only component for displaying workspace name from local DB
function _WorkspaceNameDisplay({ workspaceId }: { workspaceId: string }) {
	const { data: workspace } = useWorkspace(workspaceId);
	return <>{workspace?.name || "Workspace"}</>;
}

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId",
)({
	validateSearch: z.object({
		demo: z.boolean().optional(),
	}),
	loader: async ({ params, context }) => {
		const { formId } = params;
		try {
			const result = await context.queryClient.ensureQueryData({
				...getFormbyIdQueryOption(formId),
				revalidateIfStale: true,
			});
			return {
				initialContent: result.form.content as any[],
			};
		} catch (_error) {
			return {
				initialContent: [],
			};
		}
	},
	staleTime: 0,
	component: FormLayout,
	ssr: false,
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function FormLayout() {
	const { workspaceId, formId } = Route.useParams();
	const { pathname } = useLocation();

	const tabs = [
		{
			name: "Design",
			href: `/workspace/${workspaceId}/form-builder/${formId}`,
		},
		{
			name: "Submissions",
			href: `/workspace/${workspaceId}/form-builder/${formId}/submissions`,
		},
		{
			name: "Share",
			href: `/workspace/${workspaceId}/form-builder/${formId}/share`,
		},
		{
			name: "Integrations",
			href: `/workspace/${workspaceId}/form-builder/${formId}/integrations`,
		},
		{
			name: "Insights",
			href: `/workspace/${workspaceId}/form-builder/${formId}/insights`,
		},
		{
			name: "Settings",
			href: `/workspace/${workspaceId}/form-builder/${formId}/settings`,
		},
	];

	// Helper to check if a tab is active
	const isActive = (href: string) => {
		if (href.endsWith(formId)) {
			// Exact match for the index route (Design)
			return pathname === href;
		}
		return pathname.startsWith(href);
	};

	return (
		<div className="flex flex-col h-screen overflow-hidden bg-background">
			<AppHeader formId={formId} workspaceId={workspaceId} />

			<div className="flex flex-col flex-1 overflow-hidden">
				{/* Tab Navigation */}
				<div className="flex items-center px-12 border-b shrink-0 bg-background">
					<nav className="flex items-center gap-8">
						{tabs.map((tab) => (
							<Link
								key={tab.name}
								to={tab.href as any}
								className={cn(
									"py-3 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
									isActive(tab.href)
										? "border-foreground text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground/80",
								)}
							>
								{tab.name}
							</Link>
						))}
					</nav>
				</div>

				{/* Page Content */}
				<main className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
