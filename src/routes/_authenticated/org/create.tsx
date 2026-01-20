import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
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
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/org/create")({
	component: CreateOrgPage,
});

function CreateOrgPage() {
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const router = useRouter();
	const queryClient = useQueryClient();

	const createOrgMutation = useMutation({
		mutationFn: async () => {
			// @ts-expect-error
			const { data, error } = await authClient.organization.create({
				name,
				slug,
			});
			if (error) throw error;
			return data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["organizations"] });
			toast.success("Organization created successfully");
			router.navigate({
				to: "/dashboard",
			});
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to create organization");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name || !slug) return;
		createOrgMutation.mutate();
	};

	return (
		<div className="flex flex-1 items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Create Organization</CardTitle>
					<CardDescription>
						Create a new organization to collaborate with your team.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Organization Name</Label>
							<Input
								id="name"
								placeholder="Acme Inc."
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									if (!slug) {
										setSlug(
											e.target.value
												.toLowerCase()
												.replace(/\s+/g, "-")
												.replace(/[^a-z0-9-]/g, ""),
										);
									}
								}}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="slug">Slug</Label>
							<Input
								id="slug"
								placeholder="acme-inc"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								required
							/>
							<p className="text-xs text-muted-foreground">
								This will be used in your organization's URL.
							</p>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={createOrgMutation.isPending}
						>
							{createOrgMutation.isPending
								? "Creating..."
								: "Create Organization"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
