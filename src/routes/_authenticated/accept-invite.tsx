import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { auth, authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/accept-invite")({
	validateSearch: (search: Record<string, unknown>) => {
		return {
			invitationId: search.invitationId as string,
		};
	},
	component: AcceptInvitePage,
});

function AcceptInvitePage() {
	const { invitationId } = Route.useSearch();
	const router = useRouter();

	// getInvitation requires specific structure - use manual query
	const { data: invitation, isLoading } = useQuery({
		queryKey: ["invitation", invitationId],
		queryFn: async () => {
			const { data, error } = await authClient.organization.getInvitation({
				query: { id: invitationId },
			});
			if (error) throw error;
			return data;
		},
		enabled: !!invitationId,
	});

	const acceptMutation = useMutation(
		auth.organization.acceptInvitation.mutationOptions({
			onSuccess: () => {
				toast.success("Invitation accepted successfully");
				router.navigate({ to: "/dashboard" });
			},
			onError: (error: any) => {
				toast.error(error.message || "Failed to accept invitation");
			},
		}),
	);

	const rejectMutation = useMutation(
		auth.organization.rejectInvitation.mutationOptions({
			onSuccess: () => {
				toast.success("Invitation rejected");
				router.navigate({ to: "/dashboard" });
			},
		}),
	);

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center">
				Loading invitation...
			</div>
		);
	}

	if (!invitation) {
		return (
			<div className="flex flex-1 items-center justify-center p-4">
				<Card className="w-full max-w-md text-center">
					<CardHeader>
						<CardTitle>Invitation Not Found</CardTitle>
						<CardDescription>
							The invitation link may be invalid or has expired.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => router.navigate({ to: "/dashboard" })}>
							Go to Dashboard
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-1 items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle>Organization Invitation</CardTitle>
					<CardDescription>
						You have been invited to join{" "}
						<strong>{(invitation as any).organization?.name ?? "this organization"}</strong> as a{" "}
						<strong>{invitation.role}</strong>.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Button
						onClick={() => acceptMutation.mutate({ invitationId })}
						disabled={acceptMutation.isPending || rejectMutation.isPending}
					>
						{acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
					</Button>
					<Button
						variant="outline"
						onClick={() => rejectMutation.mutate({ invitationId })}
						disabled={acceptMutation.isPending || rejectMutation.isPending}
					>
						{rejectMutation.isPending ? "Rejecting..." : "Reject"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
