import { formatDistanceToNow } from "date-fns";
import { Loader2Icon, MoreHorizontalIcon, XIcon } from "@/components/ui/icons";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFormVersions, restoreVersion } from "@/hooks/use-form-versions";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VersionHistorySidebarProps {
  formId: string;
}

export function VersionHistorySidebar({ formId }: VersionHistorySidebarProps) {
  const { data: versions } = useFormVersions(formId);
  const { closeSidebar } = useEditorSidebar();
  const { selectedVersionId, selectVersion, exitVersionView } = useVersionHistorySidebar();
  const { data: sessionData } = useSession();
  const currentUser = sessionData?.user;
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmVersionId, setRestoreConfirmVersionId] = useState<string | null>(null);

  const versionList = versions ?? [];

  const effectiveVersionId = selectedVersionId ?? versionList[0]?.id ?? null;

  const handleRestore = async (versionId: string) => {
    setIsRestoring(true);
    try {
      const tx = restoreVersion(formId, versionId);
      await tx.isPersisted.promise;
      toast.success("Version restored. Publish again to make it live.");
      exitVersionView();
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  const getPublisherInfo = (publishedByUserId: string) => {
    if (currentUser && publishedByUserId === currentUser.id) {
      return {
        name: currentUser.name ?? "You",
        image: currentUser.image ?? undefined,
        initial: currentUser.name?.charAt(0) ?? "?",
      };
    }
    return {
      name: publishedByUserId.slice(0, 8),
      image: undefined,
      initial: publishedByUserId.charAt(0).toUpperCase(),
    };
  };

  const formatRelativeTime = (dateString: string) => {
    const distance = formatDistanceToNow(new Date(dateString), {
      addSuffix: false,
    });
    if (distance.includes("less than") || distance.includes("second")) return "Now";
    return (
      distance
        .replace(/ minutes?/, "m")
        .replace(/ hours?/, "h")
        .replace(/ days?/, "d")
        .replace(/ months?/, "mo")
        .replace(/ years?/, "y")
        .replace(/about /, "")
        .replace(/over /, "")
        .replace(/almost /, "") + " ago"
    );
  };

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      <SidebarHeader className="pr-1 pt-2  flex flex-row items-center justify-between shrink-0">
        <p className="text-sm font-medium text-muted-foreground pl-2.5 pr-2 py-1.5">
          Version History
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground rounded-lg"
          onClick={closeSidebar}
          aria-label="Close version history"
        >
          <XIcon className="size-3.5" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-[10px] relative">
        {/* Vertical timeline line */}
        {versionList.length > 1 && (
          <div
            className="absolute left-[26px] w-px bg-border/60"
            style={{
              top: `${10 + 8 + 10}px`,
              height: `${(versionList.length - 1) * 55}px`,
            }}
          />
        )}

        <div className="flex flex-col gap-1">
          {versionList.map((version, index) => {
            const publisher = getPublisherInfo(version.publishedByUserId);
            const isSelected = effectiveVersionId === version.id;
            const isCurrent = index === 0;

            return (
              <button
                key={version.id}
                onClick={() => selectVersion(version.id)}
                className={cn(
                  "flex gap-1.5 items-start pl-2 py-2 rounded-lg w-full text-left relative",
                  isSelected ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                {/* Avatar */}
                <div className="shrink-0">
                  <Avatar className="size-5 rounded-full">
                    <AvatarImage src={publisher.image} alt={publisher.name} />
                    <AvatarFallback className="text-[13px] font-medium bg-muted text-muted-foreground rounded-full">
                      {publisher.initial}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground truncate">{publisher.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {version.version} change{version.version !== 1 ? "s" : ""} ·{" "}
                    {isCurrent ? "Current" : "Published"}
                  </p>
                </div>

                {/* Suffix: timestamp or menu */}
                {isSelected ? (
                  <div className="shrink-0 self-center px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-[26px] rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Version actions"
                          />
                        }
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="end"
                        sideOffset={4}
                        className="min-w-[151px] rounded-xl p-1 flex flex-col gap-0.5"
                      >
                        <DropdownMenuItem
                          className="h-[26px] px-2 rounded-lg text-[13px]"
                          disabled={isRestoring}
                          onClick={() => setRestoreConfirmVersionId(version.id)}
                        >
                          {isRestoring ? (
                            <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                          ) : null}
                          Restore this version
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-[26px] px-2 rounded-lg text-[13px]">
                          Publish this version
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-[26px] px-2 rounded-lg text-[13px]">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="shrink-0 pt-0.5">
                    <span className="text-[13px] font-medium text-muted-foreground px-2">
                      {formatRelativeTime(version.publishedAt)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SidebarContent>

      <AlertDialog
        open={!!restoreConfirmVersionId}
        onOpenChange={(open) => {
          if (!open) setRestoreConfirmVersionId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Current draft will be overwritten. You can publish again to make it live.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreConfirmVersionId) {
                  handleRestore(restoreConfirmVersionId);
                }
                setRestoreConfirmVersionId(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
