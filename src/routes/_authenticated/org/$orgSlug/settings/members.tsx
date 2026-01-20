import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute(
	"/_authenticated/org/$orgSlug/settings/members",
)({
	component: OrgMembersSettings,
});

function OrgMembersSettings() {
	const queryClient = useQueryClient();
	const [email, setEmail] = useState("");

	const { data: members, isLoading: isLoadingMembers } = useQuery({
		queryKey: ["members"],
		queryFn: async () => {
			// @ts-expect-error
			const { data, error } = await authClient.organization.listMembers();
			if (error) throw error;
			return data;
		},
	});

	const inviteMutation = useMutation({
		mutationFn: async () => {
			// @ts-expect-error
			const { data, error } = await authClient.organization.inviteMember({
				email,
				role: "member",
			});
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			setEmail("");
			toast.success("Invitation sent successfully");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to send invitation");
		},
	});

	const removeMemberMutation = useMutation({
		mutationFn: async (memberId: string) => {
			// @ts-expect-error
			const { error } = await authClient.organization.removeMember({
				memberIdOrEmail: memberId,
			});
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["members"] });
			toast.success("Member removed successfully");
		},
	});

	const handleInvite = (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;
		inviteMutation.mutate();
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Invite Member</CardTitle>
					<CardDescription>
						Invite a new member to join your organization.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleInvite} className="flex gap-4">
						<div className="flex-1 space-y-2">
							<Label htmlFor="email" className="sr-only">
								Email
							</Label>
							<Input
								id="email"
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

			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
					<CardDescription>
						Manage members of your organization.
					</CardDescription>
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
									<TableCell
										colSpan={3}
										className="text-center py-4 text-muted-foreground"
									>
										Loading members...
									</TableCell>
								</TableRow>
							) : (
								members?.map((member: any) => (
									<TableRow key={member.id}>
										<TableCell>
											<div className="flex flex-col">
												<span className="font-medium">{member.user.name}</span>
												<span className="text-xs text-muted-foreground">
													{member.user.email}
												</span>
											</div>
										</TableCell>
										<TableCell className="capitalize">{member.role}</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive"
												onClick={() => removeMemberMutation.mutate(member.id)}
												disabled={removeMemberMutation.isPending}
											>
												<Trash2 className="h-4 w-4" />
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
