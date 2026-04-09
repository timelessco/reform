import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/theme-provider";
import { auth, useSession } from "@/lib/auth/auth-client";
import { settingsDialogStore } from "@/hooks/use-settings-dialog";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export interface UserMenuMinimalProps {
  onOpenTrash: () => void;
}

export const UserMenuMinimal = ({ onOpenTrash }: UserMenuMinimalProps) => {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const { data: session } = useSession();
  const { activeOrg } = useLoaderData({ from: "/_authenticated" });
  const displayName = activeOrg?.name ?? session?.user?.name ?? "User";

  const signOutMutation = useMutation(
    auth.signOut.mutationOptions({
      onSuccess: async () => {
        try {
          const [{ disposePersistence, clearPersistenceStorage }, { disposeLocalFormCollection }] =
            await Promise.all([
              import("@/collections/_persistence"),
              import("@/collections/local/form"),
            ]);
          // Order matters: drop the collection ref first so lingering writes
          // can't fire against a torn-down coordinator, then dispose the
          // persistence bundle, then wipe the on-disk database.
          disposeLocalFormCollection();
          await disposePersistence();
          await clearPersistenceStorage();
          // Clear the draft-migration signals so a subsequent signup with
          // a fresh draft flow through this browser still triggers sync.
          localStorage.removeItem("bf-has-local-draft");
          localStorage.removeItem("bf-last-synced-user");
        } catch (err) {
          console.warn("[auth] failed to clear local persistence on logout", err);
        }
        router.invalidate();
        router.navigate({ to: "/" });
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
      label: { dark: "Light mode", light: "System theme", system: "Dark mode" }[theme ?? "system"],
      icon: { dark: SunIcon, light: MonitorIcon, system: MoonIcon }[theme ?? "system"],
      action: () => {
        setTheme(
          { dark: "light", light: "system", system: "dark" }[theme ?? "system"] as
            | "light"
            | "system"
            | "dark",
        );
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
          <p className="min-w-0 truncate text-left text-sm text-sidebar-foreground font-case">
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
              <span className="text-[13px] text-foreground truncate">{displayName}</span>
              <span className="text-[11px] text-muted-foreground">Free Plan</span>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          {/* Account section */}
          <div className="flex flex-col">
            <div className="px-2 py-1.5 rounded-lg text-xs text-muted-foreground">Account</div>
            {accountMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] transition-colors text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Icon className={menuItemIconClass} />
                  <span className="flex-1 text-left">{item.label}</span>
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
            className="h-[26px] px-2 py-[5.5px] rounded-lg inline-flex items-center gap-1.5 overflow-hidden text-[13px] transition-colors text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
          >
            <LogOutIcon className={menuItemIconClass} />
            <span className="flex-1 text-left">Log out</span>
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
};
