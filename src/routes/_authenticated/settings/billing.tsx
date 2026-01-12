import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/billing")({
	component: BillingPage,
});

function BillingPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold">Billing</h2>
			<p className="text-muted-foreground italic">
				Billing settings coming soon...
			</p>
		</div>
	);
}
