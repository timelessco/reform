import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, Plus, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";
import { NotFound } from "@/components/ui/not-found";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings/members")({
  component: OrgMembersSettings,
  pendingComponent: Loader,
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function OrgMembersSettings() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const emailInputId = useId();

  const { data, isLoading: isLoadingMembers } = useQuery(
    auth.organization.listMembers.queryOptions(),
  );
  const members = data?.members ?? [];

  // Fetch sent invitations for this organization
  const { data: invitationsData, isLoading: isLoadingInvitations } = useQuery(
    auth.organization.listInvitations.queryOptions(),
  );
  const invitations = invitationsData ?? [];

  const inviteMutation = useMutation(
    auth.organization.inviteMember.mutationOptions({
      onSuccess: () => {
        setEmail("");
        queryClient.invalidateQueries({
          queryKey: auth.organization.listMembers.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: auth.organization.listInvitations.queryKey(),
        });
        toast.success("Invitation sent successfully");
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to send invitation");
      },
    }),
  );

  const cancelInvitationMutation = useMutation(
    auth.organization.cancelInvitation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: auth.organization.listInvitations.queryKey(),
        });
        toast.success("Invitation cancelled");
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to cancel invitation");
      },
    }),
  );

  const removeMemberMutation = useMutation(
    auth.organization.removeMember.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: auth.organization.listMembers.queryKey(),
        });
        toast.success("Member removed successfully");
      },
    }),
  );

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    inviteMutation.mutate({ email, role: "member" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
          <CardDescription>Invite a new member to join your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor={emailInputId} className="sr-only">
                Email
              </Label>
              <Input
                id={emailInputId}
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviteMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {inviteMutation.isPending ? "Inviting..." : "Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invitations sent to users who haven't joined yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingInvitations ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Loading invitations...
                  </TableCell>
                </TableRow>
              ) : invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No pending invitations
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation: any) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{invitation.role}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invitation.status === "pending"
                            ? "secondary"
                            : invitation.status === "accepted"
                              ? "default"
                              : invitation.status === "rejected"
                                ? "destructive"
                                : "outline"
                        }
                        className="capitalize"
                      >
                        {invitation.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() =>
                            cancelInvitationMutation.mutate({
                              invitationId: invitation.id,
                            })
                          }
                          disabled={cancelInvitationMutation.isPending}
                          title="Cancel invitation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage members of your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMembers ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    Loading members...
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.user.name}</span>
                        <span className="text-xs text-muted-foreground">{member.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() =>
                          removeMemberMutation.mutate({
                            memberIdOrEmail: member.id,
                          })
                        }
                        disabled={removeMemberMutation.isPending}
                      >
                        {member.role !== "owner" && <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
