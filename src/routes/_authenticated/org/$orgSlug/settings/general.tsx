import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute(
	"/_authenticated/org/$orgSlug/settings/general",
)({
	component: OrgGeneralSettings,
});

function OrgGeneralSettings() {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");

	const { data: activeOrg } = authClient.useActiveOrganization();

	useEffect(() => {
		if (activeOrg) {
			setName(activeOrg.name);
		}
	}, [activeOrg]);

	const updateOrgMutation = useMutation({
		mutationFn: async () => {
			if (!activeOrg) return;
			// @ts-expect-error
			const { data, error } = await authClient.organization.update({
				data: { name },
			});
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["activeOrganization"] });
			queryClient.invalidateQueries({ queryKey: ["organizations"] });
			toast.success("Organization updated successfully");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to update organization");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name) return;
		updateOrgMutation.mutate();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>General Settings</CardTitle>
				<CardDescription>
					Manage your organization's general information.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="org-name">Organization Name</Label>
						<Input
							id="org-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Acme Inc."
							required
						/>
					</div>
					<Button type="submit" disabled={updateOrgMutation.isPending}>
						{updateOrgMutation.isPending ? "Saving..." : "Save Changes"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
