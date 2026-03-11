import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/ThemeProvider";
import { auth, useSession } from "@/lib/auth-client";
import { settingsDialogStore } from "@/hooks/use-settings-dialog";
import { orgDataForLayoutQueryOptions } from "@/lib/fn/org";
import { getUserMembershipsQueryOptions } from "@/lib/fn/workspaces";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  Trash2Icon,
  UsersIcon,
} from "@/components/ui/icons";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export interface UserMenuMinimalProps {
  onOpenTrash: () => void;
}

export function UserMenuMinimal({ onOpenTrash }: UserMenuMinimalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const { data: session } = useSession();
  const { data: orgData } = useQuery(orgDataForLayoutQueryOptions());
  const { data: membersData } = useQuery(auth.organization.listMembers.queryOptions());
  const { data: membershipsData } = useQuery(getUserMembershipsQueryOptions());

  const activeOrg = orgData?.activeOrg ?? null;
  const orgs = orgData?.orgsData ?? [];
  const displayName = activeOrg?.name ?? session?.user?.name ?? "User";

  const roleByOrgId = useMemo(() => {
    const map: Record<string, string> = {};
    membershipsData?.memberships?.forEach((m) => {
      map[m.organizationId] = m.role;
    });
    return map;
  }, [membershipsData]);

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: () => {
        localStorage.removeItem("electricAuthToken");
        router.invalidate();
        router.navigate({ to: "/" });
      },
    }),
  );

  const setActiveOrgMutation = useMutation(
    auth.organization.setActive.mutationOptions({
      onSuccess: async () => {
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

  const accountMenuItems = [
    {
      key: "settings",
      label: "Settings",
      icon: SettingsIcon,
      action: () => {
        settingsDialogStore.open("account");
        setIsOpen(false);
      },
    },
    {
      key: "theme",
      label: theme === "dark" ? "Light mode" : "Dark mode",
      icon: theme === "dark" ? SunIcon : MoonIcon,
      action: () => {
        setTheme(theme === "dark" ? "light" : "dark");
        setIsOpen(false);
      },
    },
    {
      key: "trash",
      label: "Trash",
      icon: Trash2Icon,
      action: () => {
        onOpenTrash();
        setIsOpen(false);
      },
    },
    {
      key: "members",
      label: "Members",
      icon: UsersIcon,
      action: () => {
        settingsDialogStore.open("members");
        setIsOpen(false);
      },
    },
  ];

  const menuItemIconClass =
    "size-4 shrink-0 text-foreground/80 [&_path]:stroke-[1.6] [&_path]:stroke-current";

  return (
    <div className="bg-background transition-colors hover:bg-sidebar-active">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="md"
              className="flex w-full min-w-0 gap-2 rounded-lg overflow-hidden px-1 py-[7px] transition-colors cursor-pointer items-center justify-start"
              aria-label="Toggle user menu"
            />
          }
        >
          <div className="size-6 rounded-full overflow-hidden bg-sidebar-active flex items-center justify-center text-[10px] font-bold shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <p className="min-w-0 truncate text-left text-sm font-medium leading-[1.15] text-sidebar-foreground font-case">
            {displayName}
          </p>
          <div className="shrink-0 flex items-center">
            <ChevronDownIcon
              className={cn(
                "size-3 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180",
              )}
              strokeWidth={1.5}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          className="w-[calc(var(--anchor-width)-16px)]"
        >
          {/* User info header */}
          <div className="px-2 py-1.5 flex items-start gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sidebar-active flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-foreground truncate">
                {displayName}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Free Plan · {membersData?.members?.length ?? 0}{" "}
                {membersData?.members?.length === 1 ? "member" : "members"}
              </span>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          {/* Account section */}
          <div className="flex flex-col">
            <div className="px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground tracking-[0.24px] leading-tight">
              Account
            </div>
            {accountMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Icon className={menuItemIconClass} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="my-1 h-px bg-border" />

          {/* Organizations section */}
          <div className="flex flex-col">
            <div className="px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground tracking-[0.24px] leading-tight truncate">
              {session?.user?.email}
            </div>
            {orgs?.map((org: { id: string; name: string }) => {
              const role = roleByOrgId[org.id];
              return (
                <button
                  type="button"
                  key={org.id}
                  onClick={() => {
                    setActiveOrgMutation.mutate({ organizationId: org.id });
                    setIsOpen(false);
                  }}
                  className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  aria-label={`Switch to ${org.name}`}
                >
                  <div className="h-5 w-5 rounded bg-sidebar-active flex items-center justify-center text-[9px] font-bold text-sidebar-foreground shrink-0">
                    {getInitials(org.name)}
                  </div>
                  <span className="flex-1 text-left truncate">{org.name}</span>
                  {role && (
                    <Badge
                      variant={role === "owner" ? "default" : "outline"}
                      className="text-[9px] px-1.5 py-0 h-4 capitalize"
                    >
                      {role}
                    </Badge>
                  )}
                  {org.id === activeOrg?.id && (
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-1 h-px bg-border" />

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              signOutMutation.mutate({});
              setIsOpen(false);
            }}
            className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] font-medium tracking-[0.13px] leading-tight transition-colors text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
          >
            <LogOutIcon className={menuItemIconClass} />
            <span className="flex-1 text-left">Log out</span>
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
