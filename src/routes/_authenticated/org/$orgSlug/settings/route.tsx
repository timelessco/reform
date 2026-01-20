import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/settings")({
	loader: async ({ params }) => {
		const { data: session } = await authClient.getSession();
		// @ts-expect-error
		const { data: orgs } = await authClient.organization.list();
		const activeOrg = orgs?.find(
			(o: any) => o.id === session?.session?.activeOrganizationId,
		);

		if (!activeOrg || activeOrg.slug !== params.orgSlug) {
			// Try to find the org by slug and set it active
			const targetOrg = orgs?.find((o: any) => o.slug === params.orgSlug);

			if (targetOrg) {
				// @ts-expect-error
				await authClient.organization.setActive({
					organizationId: targetOrg.id,
				});
			} else {
				throw redirect({ to: "/dashboard" });
			}
		}
	},
	component: OrgSettingsLayout,
});

function OrgSettingsLayout() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">
					Organization Settings
				</h1>
			</div>
			<div className="mx-auto grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
				<nav className="grid gap-4 text-sm text-muted-foreground">
					<OrgSettingsNav />
				</nav>
				<div className="grid gap-6">
					<Outlet />
				</div>
			</div>
		</div>
	);
}

function OrgSettingsNav() {
	const { orgSlug } = Route.useParams();

	const items = [
		{ title: "General", href: `/org/${orgSlug}/settings/general` },
		{ title: "Members", href: `/org/${orgSlug}/settings/members` },
		{ title: "Billing", href: `/settings/billing` },
	];

	return (
		<>
			{items.map((item) => (
				<a
					key={item.href}
					href={item.href}
					className="font-semibold text-primary"
				>
					{item.title}
				</a>
			))}
		</>
	);
}
