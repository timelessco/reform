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
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings/billing")({
	component: BillingPage,
});

function BillingPage() {
	const { data: customerState, isLoading } = useQuery({
		queryKey: ["customerState"],
		queryFn: async () => {
			// @ts-expect-error
			const { data, error } = await authClient.customer.state();
			if (error) throw error;
			return data;
		},
	});

	const { data: activeOrg } = authClient.useActiveOrganization();

	const handleUpgrade = async (planSlug: string) => {
		if (!activeOrg) {
			toast.error("Please select an organization first");
			return;
		}

		try {
			// @ts-expect-error
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

	const openPortal = async () => {
		try {
			// @ts-expect-error
			const { data, error } = await authClient.customer.portal();
			if (error) throw error;
			if (data?.url) {
				window.location.href = data.url;
			}
		} catch (error: any) {
			toast.error(error.message || "Failed to open billing portal");
		}
	};

	if (isLoading) {
		return <div className="p-8">Loading billing information...</div>;
	}

	const activeSubscription = customerState?.subscriptions?.find(
		(s: any) => s.status === "active",
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Billing</h1>
				{activeSubscription && (
					<Button variant="outline" onClick={openPortal}>
						Manage Billing
					</Button>
				)}
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card className={!activeSubscription ? "border-primary" : ""}>
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
							variant={!activeSubscription ? "outline" : "ghost"}
							disabled={!activeSubscription}
						>
							{!activeSubscription ? "Current Plan" : "Downgrade"}
						</Button>
					</CardContent>
				</Card>

				<Card
					className={
						activeSubscription?.plan?.slug === "pro" ? "border-primary" : ""
					}
				>
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
							variant={
								activeSubscription?.plan?.slug === "pro"
									? "outline"
									: ("primary" as any)
							}
							onClick={() => handleUpgrade("pro")}
							disabled={activeSubscription?.plan?.slug === "pro"}
						>
							{activeSubscription?.plan?.slug === "pro"
								? "Current Plan"
								: "Upgrade to Pro"}
						</Button>
					</CardContent>
				</Card>

				<Card
					className={
						activeSubscription?.plan?.slug === "business"
							? "border-primary"
							: ""
					}
				>
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
							variant={
								activeSubscription?.plan?.slug === "business"
									? "outline"
									: ("primary" as any)
							}
							onClick={() => handleUpgrade("business")}
							disabled={activeSubscription?.plan?.slug === "business"}
						>
							{activeSubscription?.plan?.slug === "business"
								? "Current Plan"
								: "Upgrade to Business"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
