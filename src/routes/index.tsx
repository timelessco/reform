import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { guestMiddleware } from "@/middleware/auth";
import { ArrowRight, Layout, Shield, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
	server: {
		middleware: [guestMiddleware],
	},
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="flex flex-col min-h-screen bg-background">
			<AppHeader />
			<div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12">
				{/* Hero Section */}
				<div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
						<Sparkles className="w-3.5 h-3.5" />
						<span>The next generation of forms</span>
					</div>

					<h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
						Beautiful forms, <br />
						<span className="text-primary">building itself.</span>
					</h1>

					<p className="text-xl text-muted-foreground max-w-xl mx-auto">
						Create powerful, interactive forms with a Notion-like editing
						experience. No complex builders, just type and build.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
						<Button
							size="lg"
							className="h-12 px-8 text-base font-medium group"
							asChild
						>
							<Link to="/create">
								Create a free form
								<ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="h-12 px-8 text-base font-medium"
						>
							View examples
						</Button>
					</div>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full pt-12 border-t border-border/50">
					<div className="flex flex-col items-center text-center space-y-3">
						<div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-2">
							<Zap className="w-6 h-6 text-primary" />
						</div>
						<h3 className="font-semibold text-lg">Fast Building</h3>
						<p className="text-sm text-muted-foreground">
							Type `/` to add elements instantly. The fastest editing experience
							ever created for forms.
						</p>
					</div>

					<div className="flex flex-col items-center text-center space-y-3">
						<div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-2">
							<Layout className="w-6 h-6 text-primary" />
						</div>
						<h3 className="font-semibold text-lg">Beautiful Design</h3>
						<p className="text-sm text-muted-foreground">
							Premium Notion-style aesthetics that make your forms look
							professional out of the box.
						</p>
					</div>

					<div className="flex flex-col items-center text-center space-y-3">
						<div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-2">
							<Shield className="w-6 h-6 text-primary" />
						</div>
						<h3 className="font-semibold text-lg">Validation Ready</h3>
						<p className="text-sm text-muted-foreground">
							Built-in Zod validation to ensure your data is clean and
							consistent every time.
						</p>
					</div>
				</div>

				{/* Footer */}
				<footer className="pt-24 pb-8 text-muted-foreground text-sm">
					<p>&copy; 2026 Better Forms. Built with Plate and TanStack.</p>
				</footer>
			</div>
		</div>
	);
}
