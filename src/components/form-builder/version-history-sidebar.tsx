import { format } from "date-fns";
import { HelpCircle, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFormVersions, restoreVersion } from "@/hooks/use-form-versions";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface VersionHistorySidebarProps {
  formId: string;
}

export function VersionHistorySidebar({ formId }: VersionHistorySidebarProps) {
  const { data: versions } = useFormVersions(formId);
  const { selectedVersionId, selectVersion, exitVersionView } = useVersionHistorySidebar();
  const { data: sessionData } = useSession();
  const currentUser = sessionData?.user;
  const [isRestoring, setIsRestoring] = useState(false);

  const versionList = versions ?? [];
  const latestVersion = versionList[0];

  // Derive effective selection: user selection or first version
  const effectiveVersionId = selectedVersionId ?? versionList[0]?.id ?? null;

  const handleSelectVersion = (versionId: string) => {
    selectVersion(versionId);
  };

  const handleRestore = async () => {
    if (!effectiveVersionId) return;
    setIsRestoring(true);
    try {
      const tx = restoreVersion(formId, effectiveVersionId);
      await tx.isPersisted.promise;
      toast.success("Version restored. Publish again to make it live.");
      exitVersionView();
    } catch {
      toast.error("Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  // Format time for display (e.g., "03:44 PM")
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "hh:mm a");
  };

  // Format date for display (e.g., "Jan 21, 12:49 PM")
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  // Get publisher display info — use session data for current user, initial for others
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

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Sidebar Header */}
      <SidebarHeader className="px-4 h-[52px] border-b border-border/40 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-[0.13px] text-foreground/80">Version history</span>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 gap-6">
        {/* Current Version */}
        <div className="shrink-0 flex flex-col gap-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.24px] px-1">
            Current version
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-transparent border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[13px] font-medium tracking-[0.13px] text-foreground">{currentUser?.name ?? "You"}</span>
              <span className="text-[12px] text-muted-foreground">
                {formatTime(new Date().toISOString())}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5 ring-1 ring-border/20">
                <AvatarImage src={currentUser?.image ?? undefined} alt={currentUser?.name} />
                <AvatarFallback className="text-[10px] bg-muted/50 text-muted-foreground">
                  {currentUser?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-[12px] text-muted-foreground truncate">
                {currentUser?.email ?? "Current session"}
              </span>
            </div>
          </div>
        </div>

        {/* Version List */}
        <div className="flex flex-col gap-2 relative mt-4">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.24px] px-1 mb-2">
            {versionList.length} published version{versionList.length !== 1 ? "s" : ""}
          </div>

          <div className="pl-1 flex flex-col gap-4">
            {versionList.map((version, index) => {
              const publisher = getPublisherInfo(version.publishedByUserId);
              const isSelected = effectiveVersionId === version.id;
              const versionNumber = versionList.length - index;
              const isLatest = index === 0;

              return (
                <div key={version.id} className="relative pl-[36px] z-10 group/timeline">
                  {/* Vertical Timeline connector */}
                  {index !== versionList.length - 1 && (
                    <div className="absolute left-[11.5px] top-[26px] -bottom-[20px] w-px bg-border/60 z-[-1] group-hover/timeline:bg-border transition-colors" />
                  )}

                  {/* Horizontal Connector to Card */}
                  <div className={cn(
                    "absolute left-[24px] top-[14px] h-px z-[-1] transition-all duration-300",
                    isSelected
                      ? "w-[12px] bg-foreground/30"
                      : "w-[6px] bg-border/60 group-hover/timeline:w-[12px] group-hover/timeline:bg-border"
                  )} />

                  {/* Node */}
                  <div
                    className={cn(
                      "absolute left-0 top-[2px] w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 ring-4 ring-background transition-all duration-300",
                      isSelected
                        ? "bg-foreground text-background shadow-sm scale-110"
                        : "bg-muted text-muted-foreground border border-border/80 group-hover/timeline:border-border group-hover/timeline:text-foreground/80 scale-100"
                    )}
                  >
                    {versionNumber}
                  </div>

                  <button
                    onClick={() => handleSelectVersion(version.id)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg flex flex-col items-start justify-start group text-left transition-all relative",
                      isSelected
                        ? "bg-accent/70 border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                        : "bg-transparent border border-transparent hover:bg-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[13px] font-medium tracking-[0.13px]",
                          isSelected ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                        )}>
                          Version {versionNumber}
                        </span>
                        {isLatest && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-teal-100 dark:bg-teal-700/20 text-teal-700 dark:text-teal-400">
                            Latest
                          </span>
                        )}
                      </div>
                      {version.id === latestVersion?.id && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground opacity-60" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full mt-2">
                      <span className="text-[11px] text-muted-foreground/80 font-medium">
                        {isLatest
                          ? formatTime(version.publishedAt)
                          : formatDateTime(version.publishedAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors">
                          {publisher.name}
                        </span>
                        <Avatar className="h-[18px] w-[18px] ring-1 ring-border/30">
                          <AvatarImage src={publisher.image} />
                          <AvatarFallback className="text-[9px] bg-muted/60 text-muted-foreground">{publisher.initial}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </SidebarContent>

      {/* Restore Action */}
      <SidebarFooter className="p-4 border-t border-border/40 bg-background">
        <Button
          onClick={handleRestore}
          disabled={!effectiveVersionId || isRestoring}
          className="w-full h-8 px-4 text-[13px] font-medium tracking-[0.13px] bg-foreground text-background hover:bg-foreground/90 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-lg transition-all"
        >
          {isRestoring ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
          Restore version
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
