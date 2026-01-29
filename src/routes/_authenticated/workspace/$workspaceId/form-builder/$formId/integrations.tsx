import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/workspace/$workspaceId/form-builder/$formId/integrations",
)({
	component: IntegrationsPage,
});

function IntegrationsPage() {
	return (
		<div className="p-12 max-w-5xl mx-auto w-full space-y-8">
			<h1 className="text-4xl font-bold tracking-tight">Integrations</h1>
			<p className="text-muted-foreground">
				Connect your form with other apps and services.
			</p>

			<div className="border border-dashed rounded-xl p-20 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20">
				<p className="font-medium">No integrations active</p>
				<p className="text-sm text-muted-foreground max-w-xs">
					Integrations like Slack, Discord, and Google Sheets are coming soon.
				</p>
			</div>
		</div>
	);
}
