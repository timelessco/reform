import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "../../components/layout/sidebar";
import { SidebarInset, SidebarProvider } from "../../components/ui/sidebar";
import { authMiddleware } from "../../middleware/auth";

export const Route = createFileRoute("/_authenticated")({
	server: {
		middleware: [authMiddleware],
	},
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<SidebarProvider defaultOpen={true}>
			<div className="flex min-h-screen w-full">
				<AppSidebar />
				<SidebarInset className="flex flex-col flex-1 min-h-screen">
					<Outlet />
				</SidebarInset>
			</div>
		</SidebarProvider>
	);
}
