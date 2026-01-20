import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient, useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	ChevronDown,
	Globe,
	Home,
	LogOut,
	Settings,
	Users,
} from "lucide-react";

export function OrganizationSwitcher() {
	const { isMobile } = useSidebar();
	const router = useRouter();
	const { data: session } = useSession();
	const user = session?.user;

	const { data: activeOrg } = useQuery({
		queryKey: ["activeOrganization"],
		queryFn: async () => {
			// @ts-expect-error
			const { data, error } = await authClient.organization.getActive();
			if (error) return null;
			return data;
		},
	});

	const handleLogout = async () => {
		await authClient.signOut();
		router.navigate({ to: "/" });
	};

	const getInitials = (name?: string | null) => {
		if (!name) return "U";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const displayName = activeOrg?.name || user?.name || "User";

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-full">
								<AvatarImage src={user?.image || undefined} alt={displayName} />
								<AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xs">
									{getInitials(displayName)}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{displayName}</span>
							</div>
							<ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-48 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuItem
							onClick={() => router.navigate({ to: "/dashboard" })}
							className="gap-2.5 py-2"
						>
							<Home className="h-4 w-4" />
							<span>Home</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								router.navigate({
									to: "/org/$orgSlug/settings/members",
									params: { orgSlug: activeOrg?.slug || "" },
								})
							}
							className="gap-2.5 py-2"
						>
							<Users className="h-4 w-4" />
							<span>Members</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								router.navigate({
									// @ts-expect-error
									to: "/org/$orgSlug/settings/domains",
									// @ts-expect-error
									params: { orgSlug: activeOrg?.slug || "" },
								})
							}
							className="gap-2.5 py-2"
						>
							<Globe className="h-4 w-4" />
							<span>Domains</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								router.navigate({
									to: "/org/$orgSlug/settings/general",
									params: { orgSlug: activeOrg?.slug || "" },
								})
							}
							className="gap-2.5 py-2"
						>
							<Settings className="h-4 w-4" />
							<span>Settings</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleLogout}
							className="gap-2.5 py-2"
						>
							<LogOut className="h-4 w-4" />
							<span>Log out</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
