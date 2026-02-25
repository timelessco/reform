import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ChevronDown, Home, LogOut, Settings, Users } from "lucide-react";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { auth, useSession } from "@/lib/auth-client";
import { getUserMembershipsQueryOptions } from "@/lib/fn/workspaces";

function OrganizationSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user;

  const { data: activeOrg } = useQuery(
    auth.organization.getFullOrganization.queryOptions(),
  );

  const { data: orgs } = useQuery(auth.organization.list.queryOptions());

  const { data: membershipsData } = useQuery(getUserMembershipsQueryOptions());

  const roleByOrgId = useMemo(() => {
    const map: Record<string, string> = {};
    membershipsData?.memberships?.forEach((m) => {
      map[m.organizationId] = m.role;
    });
    return map;
  }, [membershipsData]);

  const setActiveOrgMutation = useMutation(
    auth.organization.setActive.mutationOptions({
      onSuccess: async () => {
        // Invalidate and wait for refetch before navigating
        await queryClient.invalidateQueries({
          queryKey: ["organization", "getFullOrganization"],
          refetchType: "all",
        });
        await queryClient.invalidateQueries({
          queryKey: ["workspaces-with-forms"],
          refetchType: "all",
        });
        router.navigate({ to: "/dashboard" });
      },
    }),
  );

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        router.navigate({ to: "/" });
      },
    }),
  );

  const handleLogout = () => {
    signOutMutation.mutate({});
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
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
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
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-48 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Organizations
            </div>
            {orgs?.map((org) => {
              const role = roleByOrgId[org.id];
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() =>
                    setActiveOrgMutation.mutate({ organizationId: org.id })
                  }
                  className="gap-2.5 py-2"
                >
                  <Avatar className="h-4 w-4 rounded-full">
                    <AvatarFallback className="text-[8px]">
                      {getInitials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{org.name}</span>
                  {role && (
                    <Badge
                      variant={role === "owner" ? "default" : "outline"}
                      className="text-[9px] px-1.5 py-0 h-4 capitalize"
                    >
                      {role}
                    </Badge>
                  )}
                  {org.id === activeOrg?.id && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
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
                  to: "/settings/members",
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
                  to: "/settings",
                })
              }
              className="gap-2.5 py-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2.5 py-2">
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
