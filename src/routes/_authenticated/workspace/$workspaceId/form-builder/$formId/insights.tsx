import { createFileRoute } from "@tanstack/react-router";
import {
	ChevronDown,
	Clock,
	MousePointer2,
	User,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/workspace/$workspaceId/form-builder/$formId/insights",
)({
  component: InsightsPage,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function InsightsPage() {
	return <InsightsContent />;
}

export function InsightsContent() {
	const [activeSubTab, setActiveSubTab] = useState<"visits" | "drop-off">(
		"visits",
	);

  const stats = [
    { label: "Visits", value: "0", icon: MousePointer2 },
    { label: "Unique visitors", value: "0", icon: User },
    { label: "Submissions", value: "1", icon: Users },
    { label: "Unique respondents", value: "1", icon: Users },
    { label: "Visit duration", value: "11s", icon: Clock },
  ];

  const analyticsGrids = [
    { title: "Sources", items: [] },
    { title: "Devices", items: [] },
    { title: "Countries", items: [] },
    { title: "Cities", items: [] },
    { title: "Browsers", items: [] },
    { title: "Operating Systems", items: [] },
  ];

	return (
		<div className="space-y-8">
			{/* Secondary Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg self-start">
					<button
						onClick={() => setActiveSubTab("visits")}
						className={cn(
							"px-3 py-1.5 text-sm font-medium rounded-md transition-all",
							activeSubTab === "visits"
								? "bg-background shadow-sm text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Visits
					</button>
					<button
						onClick={() => setActiveSubTab("drop-off")}
						className={cn(
							"px-3 py-1.5 text-sm font-medium rounded-md transition-all",
							activeSubTab === "drop-off"
								? "bg-background shadow-sm text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						Question drop-off
					</button>
				</div>

				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-2 bg-background border-muted/60"
				>
					<span>Last 24 hours</span>
					<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
				</Button>
			</div>

			{/* Stats Row */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{stats.map((stat) => (
					<Card
						key={stat.label}
						className="border-none shadow-none bg-muted/20"
					>
						<CardHeader className="p-4 pb-0">
							<CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								{stat.label}
							</CardTitle>
						</CardHeader>
						<CardContent className="p-4 pt-1">
							<div className="text-2xl font-semibold">{stat.value}</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Main Chart Area Placeholder */}
			<div className="border border-dashed rounded-2xl min-h-[300px] flex items-center justify-center bg-muted/5">
				<div className="text-center space-y-1">
					<p className="text-sm font-medium text-muted-foreground/60">
						No data
					</p>
				</div>
			</div>

			{/* Analytics Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-6">
				{analyticsGrids.map((grid) => (
					<div key={grid.title} className="space-y-3">
						<h3 className="text-sm font-semibold text-muted-foreground/80">
							{grid.title}
						</h3>
						<div className="border border-dashed rounded-xl h-24 flex items-center justify-center bg-muted/5">
							<p className="text-xs text-muted-foreground/50">No data</p>
						</div>
					</div>
				))}
			</div>

				{/* Footer */}
				<div className="pt-12 pb-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
					<p className="text-[11px] text-muted-foreground leading-relaxed text-center md:text-left max-w-2xl">
						Privacy-friendly and fully anonymous analytics — no cookies, no
						personal data, and no cross-device tracking.
					</p>
					<div className="flex gap-4">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full"
						>
							<Globe className="h-4 w-4 text-muted-foreground" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full"
						>
							<Search className="h-4 w-4 text-muted-foreground" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
