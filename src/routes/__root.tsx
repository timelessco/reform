import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Agentation } from "agentation";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { Toaster } from "@/components/ui/sonner";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import type { Session } from "../lib/auth";
import { sessionMiddleware } from "../middleware/auth";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
	session: Session | null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
	server: {
		middleware: [sessionMiddleware],
	},
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen bg-background text-foreground antialiased font-sans">
				{children}
				<Toaster richColors />
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				{process.env.NODE_ENV === "development" && <Agentation />}
				<Scripts />
			</body>
		</html>
	);
}
