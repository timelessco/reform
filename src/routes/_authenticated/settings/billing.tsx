import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { auth, authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings/billing")({
	component: BillingPage,
	pendingComponent: Loader,
	errorComponent: ErrorBoundary,
	notFoundComponent: NotFound,
});

function BillingPage() {
	const { data: customerState, isLoading } = useQuery(
		auth.customer.state.queryOptions(),
	);

	const { data: activeOrg } = useQuery(
		auth.organization.getFullOrganization.queryOptions(),
	);

	const handleUpgrade = async (planSlug: string) => {
		if (!activeOrg) {
			toast.error("Please select an organization first");
			return;
		}
		try {
			const { data, error } = await authClient.checkout({
				slug: planSlug,
				referenceId: activeOrg.id,
			});

			if (error) throw error;

			if (data?.url) {
				window.location.href = data.url;
			}
		} catch (error: any) {
			toast.error(error.message || "Failed to initiate checkout");
		}
	};

	const {
		data: portalData,
		refetch: openPortal,
		isFetching: isOpeningPortal,
	} = useQuery({
		...auth.customer.portal.queryOptions(),
		enabled: false, // Only fetch when triggered
	});

	// Handle portal redirect when data is fetched
	if (portalData?.url && !isOpeningPortal) {
		window.location.href = portalData.url;
	}

	const handleOpenPortal = () => {
		openPortal();
	};

	const activeSubscription = customerState?.activeSubscriptions?.[0];

	const isFreePlan = !activeSubscription;
	const isProPlan =
		activeSubscription?.productId === "3662224a-d998-4a73-bf82-4957198d53ea" ||
		activeSubscription?.productId === "0be62924-d418-4dcc-8c8c-2b4929f76695";
	const isBusinessPlan = false; // Add your business product ID when ready

	if (isLoading) {
		return <div className="p-8">Loading billing information...</div>;
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Billing</h1>
				{activeSubscription && (
					<Button variant="outline" onClick={handleOpenPortal}>
						Manage Billing
					</Button>
				)}
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card className={isFreePlan ? "border-primary" : ""}>
					<CardHeader>
						<CardTitle>Free</CardTitle>
						<CardDescription>Perfect for personal projects.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-3xl font-bold">$0</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• 1 member</li>
							<li>• 3 forms</li>
							<li>• 100 submissions/mo</li>
						</ul>
						<Button
							className="w-full"
							variant={isFreePlan ? "outline" : "ghost"}
							disabled={isFreePlan}
						>
							{isFreePlan ? "Current Plan" : "Downgrade"}
						</Button>
					</CardContent>
				</Card>

				<Card className={isProPlan ? "border-primary" : ""}>
					<CardHeader>
						<CardTitle>Pro</CardTitle>
						<CardDescription>For growing teams.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-3xl font-bold">$19/mo</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• 5 members</li>
							<li>• Unlimited forms</li>
							<li>• 10k submissions/mo</li>
						</ul>
						<Button
							className="w-full"
							variant={isProPlan ? "outline" : "default"}
							onClick={() => handleUpgrade("Pro")}
							disabled={isProPlan}
						>
							{isProPlan ? "Current Plan" : "Upgrade to Pro"}
						</Button>
					</CardContent>
				</Card>

				<Card className={isBusinessPlan ? "border-primary" : ""}>
					<CardHeader>
						<CardTitle>Business</CardTitle>
						<CardDescription>Enterprise-grade features.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-3xl font-bold">$49/mo</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• Unlimited members</li>
							<li>• Custom domains</li>
							<li>• API access</li>
						</ul>
						<Button
							className="w-full"
							variant={isBusinessPlan ? "outline" : "default"}
							onClick={() => handleUpgrade("Pro-(Yearly)")}
							disabled={isBusinessPlan}
						>
							{isBusinessPlan ? "Current Plan" : "Upgrade to Business"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
