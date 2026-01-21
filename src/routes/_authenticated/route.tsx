import { createContext, useContext } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "../../components/layout/sidebar";
import { SidebarInset, SidebarProvider } from "../../components/ui/sidebar";
import { authMiddleware } from "../../middleware/auth";
import { getWorkspacesWithForms } from "@/lib/fn/workspaces";

// Type for prefetched sidebar data
type PrefetchedSidebarData = {
	workspaces: Awaited<ReturnType<typeof getWorkspacesWithForms>>["workspaces"];
};

// Context for sharing prefetched data with sidebar
const PrefetchedDataContext = createContext<PrefetchedSidebarData | null>(null);

export const usePrefetchedData = () => useContext(PrefetchedDataContext);

export const Route = createFileRoute("/_authenticated")({
	server: {
		middleware: [authMiddleware],
	},
	loader: async () => {
		try {
			const data = await getWorkspacesWithForms();
			return { prefetchedWorkspaces: data.workspaces };
		} catch (error) {
			console.error("Failed to prefetch workspaces:", error);
			return { prefetchedWorkspaces: [] };
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	const { prefetchedWorkspaces } = Route.useLoaderData();

	return (
		<PrefetchedDataContext.Provider value={{ workspaces: prefetchedWorkspaces }}>
			<SidebarProvider defaultOpen={true}>
				<div className="flex min-h-screen w-full">
					<AppSidebar />
					<SidebarInset className="flex flex-col flex-1 min-h-screen">
						<Outlet />
					</SidebarInset>
				</div>
			</SidebarProvider>
		</PrefetchedDataContext.Provider>
	);
}
