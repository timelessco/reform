import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { auth, useSession } from "@/lib/auth-client";
import { orgDataForLayoutQueryOptions } from "@/lib/fn/org";
import { getUserMembershipsQueryOptions } from "@/lib/fn/workspaces";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  ChevronDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const { data: membersData } = useQuery(
    auth.organization.listMembers.queryOptions(),
  );
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
        localStorage.clear();
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

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-menu-container")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative user-menu-container border-t border-b pt-[4.8px] pb-2 bg-background">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 h-8 w-full min-w-0 rounded-md hover:bg-sidebar-active justify-start"
        aria-label="Toggle user menu"
      >
        <div className="h-6 w-6 rounded-full overflow-hidden bg-sidebar-active flex items-center justify-center text-[10px] font-bold shrink-0">
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
        <span className="text-[14px] font-medium text-sidebar-foreground truncate flex-1 text-left tracking-[0.14px]">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
            isOpen && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </Button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-background border rounded-xl shadow-[0px_4px_16px_rgba(0,0,0,0.08)] p-1.5 z-100 animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[220px]">
          <div className="px-3 py-2 border-b mb-1.5 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-sidebar-active flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden">
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
              <span className="text-[14px] font-bold text-sidebar-foreground truncate">
                {displayName}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Free Plan · {membersData?.members?.length ?? 0}{" "}
                {membersData?.members?.length === 1 ? "member" : "members"}
              </span>
            </div>
          </div>

          <div className="px-2 py-1 mb-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">
              Account
            </p>
            <div className="space-y-0.5">
              <Button
                variant="ghost"
                onClick={() => {
                  router.navigate({ to: "/settings/my-account" });
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-active rounded-lg"
              >
                <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
                Settings
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-active rounded-lg"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenTrash();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-active rounded-lg"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Trash
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  router.navigate({ to: "/settings/members" });
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-active rounded-lg"
              >
                <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                Members
              </Button>
            </div>
          </div>

          <div className="px-2 py-1 mb-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-1">
              {session?.user?.email}
            </p>
            <div className="space-y-0.5">
              {orgs?.map((org: { id: string; name: string }) => {
                const role = roleByOrgId[org.id];
                return (
                  <Button
                    variant="ghost"
                    key={org.id}
                    onClick={() => {
                      setActiveOrgMutation.mutate({ organizationId: org.id });
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 h-auto w-full justify-start text-muted-foreground hover:bg-sidebar-active rounded-lg"
                    aria-label={`Switch to ${org.name}`}
                  >
                    <div className="h-5 w-5 rounded bg-sidebar-active flex items-center justify-center text-[9px] font-bold text-sidebar-foreground">
                      {getInitials(org.name)}
                    </div>
                    <span className="text-[13px] font-medium text-foreground group-hover:text-sidebar-foreground flex-1 truncate">
                      {org.name}
                    </span>
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
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-foreground/5 my-1" />
          <div className="space-y-0.5 px-1">
            <Button
              variant="ghost"
              onClick={() => {
                signOutMutation.mutate({});
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 h-auto justify-start text-[13px] text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-active rounded-lg"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              Log out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
