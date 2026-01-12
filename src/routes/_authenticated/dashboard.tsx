import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	FileText,
	HelpCircle,
	LayoutGrid,
	MoreHorizontal,
	Plus,
	Search,
	Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const navigate = useNavigate();

	const forms = [
		{
			id: "main-document",
			title: "Untitled",
			status: "Draft",
			edited: "Edited 2m ago",
		},
	];

	return (
		<div className="flex-1 flex flex-col min-h-screen bg-background">
			{/* Dashboard Header */}
			<header className="h-12 border-b flex items-center justify-between px-6 shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground mr-1">*</span>
					<span className="text-muted-foreground">/</span>
					<span className="text-sm font-medium">My workspace</span>
				</div>
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-2 text-muted-foreground"
					>
						<Search className="h-4 w-4" />
						<span>Search</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground"
					>
						<LayoutGrid className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground"
					>
						<Settings className="h-4 w-4" />
					</Button>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 p-12 max-w-5xl mx-auto w-full space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="text-4xl font-bold tracking-tight">My workspace</h1>
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							className="h-9 gap-2 text-muted-foreground"
						>
							<Plus className="h-4 w-4" />
							New workspace
						</Button>
						<Button
							size="sm"
							className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
							onClick={() => navigate({ to: "/form-builder" })}
						>
							<Plus className="h-4 w-4" />
							New form
						</Button>
					</div>
				</div>

				{/* Forms List */}
				<div className="space-y-4 pt-4">
					<div className="grid grid-cols-1 gap-1">
						{forms.map((form) => (
							<div
								key={form.id}
								className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
								onClick={() => navigate({ to: "/form-builder" })}
							>
								<div className="flex items-center gap-4">
									<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
										<FileText className="h-5 w-5 text-muted-foreground" />
									</div>
									<div className="flex flex-col">
										<div className="flex items-center gap-2">
											<span className="font-medium">{form.title}</span>
											<Badge
												variant="secondary"
												className="text-[10px] h-4 px-1.5 font-normal bg-muted text-muted-foreground"
											>
												{form.status}
											</Badge>
										</div>
										<span className="text-xs text-muted-foreground">
											{form.edited}
										</span>
									</div>
								</div>

								<DropdownMenu>
									<DropdownMenuTrigger
										asChild
										onClick={(e) => e.stopPropagation()}
									>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem>Rename</DropdownMenuItem>
										<DropdownMenuItem>Duplicate</DropdownMenuItem>
										<DropdownMenuItem className="text-destructive">
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						))}
					</div>

					{forms.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-2xl bg-muted/20">
							<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
								<FileText className="h-6 w-6 text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<p className="font-medium">No forms yet</p>
								<p className="text-sm text-muted-foreground max-w-xs">
									Create your first form and start collecting responses in
									minutes.
								</p>
							</div>
							<Button
								size="sm"
								onClick={() => navigate({ to: "/form-builder" })}
							>
								Create my first form
							</Button>
						</div>
					)}
				</div>
			</main>

			{/* Help Circle */}
			<div className="fixed bottom-6 right-6">
				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted shadow-sm border"
				>
					<HelpCircle className="h-5 w-5 text-muted-foreground" />
				</Button>
			</div>
		</div>
	);
}
