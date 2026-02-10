import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import { auth, authClient } from "@/lib/auth-client";
import { logger } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      invitationId: search.invitationId as string,
    };
  },
  component: AcceptInvitePage,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function AcceptInvitePage() {
  const { invitationId } = Route.useSearch();
  const router = useRouter();

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      logger("[AcceptInvite] Fetching invitation:", invitationId);
      const result = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      logger("[AcceptInvite] Full result:", JSON.stringify(result, null, 2));
      if (result.error) {
        logger("[AcceptInvite] Error fetching invitation:", result.error);
        throw result.error;
      }
      if (!result.data) {
        logger("[AcceptInvite] No data returned for invitation:", invitationId);
        return null;
      }
      return result.data;
    },
    enabled: !!invitationId,
    retry: 1,
    staleTime: 0,
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
    return <div className="flex flex-1 items-center justify-center">Loading invitation...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Error Loading Invitation</CardTitle>
            <CardDescription>
              {error.message ||
                "There was a problem loading this invitation. Please check the link and try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.navigate({ to: "/dashboard" })}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>The invitation link may be invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.navigate({ to: "/dashboard" })}>Go to Dashboard</Button>
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
