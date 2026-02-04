import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import { Link as LinkIcon, Pencil } from "lucide-react";
import type { Value } from "platejs";
import { z } from "zod";
import { FormActionsMenu } from "@/components/form-builder/form-actions-menu";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { useForm } from "@/hooks/use-live-hooks";
import { getFormbyIdQueryOption } from "@/lib/fn/forms";
import { cn } from "@/lib/utils";

type RedirectError = {
	to?: string;
	href?: string;
	isRedirect?: boolean;
	statusCode?: number;
};

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId",
)({
	validateSearch: z.object({
		demo: z.boolean().optional(),
	}),
	// Redirect to appropriate child route based on form status
	beforeLoad: async ({ context, params, location }) => {
		// Only redirect if we're at the exact parent route (no child route)
		const isExactParentRoute =
			location.pathname ===
				`/workspace/${params.workspaceId}/form-builder/${params.formId}` ||
			location.pathname ===
				`/workspace/${params.workspaceId}/form-builder/${params.formId}/`;

		if (isExactParentRoute) {
			console.log(
				"[route.tsx beforeLoad] At parent route, checking form status for redirect...",
			);
			try {
				const result = await context.queryClient.ensureQueryData({
					...getFormbyIdQueryOption(params.formId),
					revalidateIfStale: true,
				});

				const status = result?.form?.status;
				console.log("[route.tsx beforeLoad] Form status:", status);

				if (status === "published") {
					throw redirect({
						to: "/workspace/$workspaceId/form-builder/$formId/share",
						params: { workspaceId: params.workspaceId, formId: params.formId },
					});
				} else {
					throw redirect({
						to: "/workspace/$workspaceId/form-builder/$formId/edit",
						params: { workspaceId: params.workspaceId, formId: params.formId },
					});
				}
			} catch (error: unknown) {
				// If it's a redirect (TanStack Router throws redirect objects), rethrow it
				// Redirect objects have specific properties like 'to', 'href', or are Response instances
				const redirectError = error as RedirectError;
				if (
					error instanceof Response ||
					(typeof error === "object" &&
						error !== null &&
						(redirectError.to !== undefined ||
							redirectError.href !== undefined ||
							redirectError.isRedirect === true ||
							redirectError.statusCode === 301 ||
							redirectError.statusCode === 302 ||
							redirectError.statusCode === 307 ||
							redirectError.statusCode === 308))
				) {
					throw error;
				}
				// On error, default to edit route
				console.error(
					"[route.tsx beforeLoad] Error fetching form, defaulting to edit:",
					error,
				);
				throw redirect({
					to: "/workspace/$workspaceId/form-builder/$formId/edit",
					params: { workspaceId: params.workspaceId, formId: params.formId },
				});
			}
		}
	},
	loader: async ({ params, context }) => {
		const { formId } = params;
		try {
			const result = await context.queryClient.ensureQueryData({
				...getFormbyIdQueryOption(formId),
				revalidateIfStale: true,
			});
			const initialContent = (result.form.content as Value) ?? ([] as Value);
			return {
				initialContent,
			};
		} catch {
			return {
				initialContent: [] as Value,
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
	const { pathname } = useLocation();
	// Extract formId from pathname to ensure it's always current
	const formIdFromPath =
		pathname.split("/form-builder/")[1]?.split("/")[0] || "";
	const params = Route.useParams();
	const { workspaceId } = params;
	const formId = formIdFromPath || params.formId;

	// Get form and workspace data from local Electric DB
	const { data: formData } = useForm(formId);
	const form = formData?.[0];
	const formTitle = form?.title || "Untitled Form";

	// Hide header on edit route (editor has its own full-screen layout)
	const isEditRoute =
		pathname.includes("/form-builder/") && pathname.includes("/edit");

	const tabs: Array<{ name: string; href: string }> = [
		{
			name: "Summary",
			href: `/workspace/${workspaceId}/form-builder/${formId}/summary`,
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
			return pathname === href;
		}
		return pathname.startsWith(href);
	};

	// For edit route, render without header
	if (isEditRoute) {
		return (
			<div className="flex flex-col h-screen overflow-hidden bg-background">
				<main className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
					<Outlet key={formId} />
				</main>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen overflow-hidden bg-background">
			{/* Header Section */}
			<div className="shrink-0 bg-background pt-16">
				<div className="max-w-5xl mx-auto w-full px-8">
					<div className="flex items-center justify-between mb-8">
						<div className="flex items-center gap-3">
							<h1 className="text-3xl font-bold text-foreground tracking-tight">
								{formTitle}
							</h1>
							<FormActionsMenu form={form} workspaceId={workspaceId} />
						</div>

						<div className="flex items-center gap-3">
							<button
								type="button"
								className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
							>
								<LinkIcon className="h-4 w-4" />
							</button>
							<Button asChild variant="default">
								<Link
									to="/workspace/$workspaceId/form-builder/$formId/edit"
									params={{ workspaceId, formId }}
									search={{ force: true }}
								>
									<Pencil className="h-3.5 w-3.5 fill-white/20" />
									Edit
								</Link>
							</Button>
						</div>
					</div>

					{/* Tab Navigation */}
					<nav className="flex items-center gap-6">
						{tabs.map((tab) => (
							<Link
								key={tab.name}
								to={tab.href}
								className={cn(
									"pb-3 text-[13px] font-medium transition-all relative",
									isActive(tab.href)
										? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
										: "text-muted-foreground/60 hover:text-foreground/80",
								)}
							>
								{tab.name}
							</Link>
						))}
					</nav>
				</div>
			</div>

			{/* Page Content */}
			<main className="flex-1 min-h-0 min-w-0 overflow-auto relative">
				<div className="max-w-5xl mx-auto w-full px-8 pb-20">
					<Outlet key={formId} />
				</div>
			</main>
		</div>
	);
}
