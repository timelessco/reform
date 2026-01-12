"use client";

import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
	Bell,
	BookOpen,
	ChevronRight,
	FileText,
	Gift,
	Globe,
	HelpCircle,
	Home,
	LayoutTemplate,
	LogOut,
	Map,
	MessageSquare,
	Plus,
	Search,
	Settings,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import type * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { auth, useSession } from "@/lib/auth-client";

const data = {
	navMain: [
		{
			title: "Home",
			url: "/dashboard",
			icon: Home,
		},
		{
			title: "Search",
			url: "#",
			icon: Search,
		},
		{
			title: "Members",
			url: "#",
			icon: Users,
		},
		{
			title: "Domains",
			url: "#",
			icon: Globe,
		},
		{
			title: "Settings",
			url: "#",
			icon: Settings,
		},
		{
			title: "Upgrade plan",
			url: "#",
			icon: Sparkles,
			className: "text-purple-500",
		},
	],
	workspaces: [
		{
			name: "My workspace",
			url: "#",
			emoji: "📄",
		},
	],
	products: [
		{
			title: "Templates",
			url: "#",
			icon: LayoutTemplate,
		},
		{
			title: "What's new",
			url: "#",
			icon: Bell,
		},
		{
			title: "Roadmap",
			url: "#",
			icon: Map,
		},
		{
			title: "Feature requests",
			url: "#",
			icon: MessageSquare,
		},
		{
			title: "Rewards",
			url: "#",
			icon: Gift,
		},
		{
			title: "Trash",
			url: "#",
			icon: Trash2,
		},
	],
	help: [
		{
			title: "Get started",
			url: "#",
			icon: FileText,
		},
		{
			title: "How-to guides",
			url: "#",
			icon: BookOpen,
		},
		{
			title: "Help center",
			url: "#",
			icon: HelpCircle,
		},
		{
			title: "Contact support",
			url: "#",
			icon: MessageSquare,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { data: sessionData } = useSession();
	const location = useLocation();
	const router = useRouter();
	const user = sessionData?.user;
	const { isMobile } = useSidebar();

	const signOutMutation = useMutation(
		auth.signOut.mutationOptions({
			onSuccess: () => {
				router.navigate({ to: "/" });
			},
		}),
	);

	return (
		<Sidebar
			variant="sidebar"
			collapsible="icon"
			className="border-r bg-muted/30"
			{...props}
		>
			<SidebarHeader className="p-4">
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage
											src={user?.image || ""}
											alt={user?.name || ""}
										/>
										<AvatarFallback className="rounded-lg">
											{user?.name?.charAt(0) || "U"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{user?.name || "User"}
										</span>
									</div>
									<ChevronRight className="ml-auto h-4 w-4 rotate-90" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
								align="start"
								side={isMobile ? "bottom" : "right"}
								sideOffset={4}
							>
								<DropdownMenuItem asChild>
									<Link to="/dashboard" className="flex items-center gap-2">
										<Home className="h-4 w-4" />
										<span>Home</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Users className="h-4 w-4 mr-2" />
									<span>Members</span>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Globe className="h-4 w-4 mr-2" />
									<span>Domains</span>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link
										to="/settings/my-account"
										className="flex items-center gap-2"
									>
										<Settings className="h-4 w-4" />
										<span>Settings</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => signOutMutation.mutate({})}
									className="text-destructive"
								>
									<LogOut className="h-4 w-4 mr-2" />
									<span>Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{data.navMain.map((item) => (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									isActive={location.pathname === item.url}
									tooltip={item.title}
									className={item.className}
								>
									<Link to={item.url}>
										<item.icon />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Workspaces</SidebarGroupLabel>
					<SidebarGroupAction title="Add Workspace">
						<Plus />
						<span className="sr-only">Add Workspace</span>
					</SidebarGroupAction>
					<SidebarMenu>
						{data.workspaces.map((workspace) => (
							<SidebarMenuItem key={workspace.name}>
								<SidebarMenuButton asChild tooltip={workspace.name}>
									<Link to={workspace.url} className="flex items-center gap-2">
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
										<span>{workspace.name}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Product</SidebarGroupLabel>
					<SidebarMenu>
						{data.products.map((item) => (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild tooltip={item.title}>
									<Link to={item.url}>
										<item.icon />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel>Help</SidebarGroupLabel>
					<SidebarMenu>
						{data.help.map((item) => (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild tooltip={item.title}>
									<Link to={item.url}>
										<item.icon />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton tooltip="Quick help">
							<HelpCircle className="h-4 w-4" />
							<span>Support</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
