import { format } from "date-fns";
import { HelpCircle, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFormVersions, useRestoreVersion } from "@/hooks/use-form-versions";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface VersionHistorySidebarProps {
  formId: string;
}

export function VersionHistorySidebar({ formId }: VersionHistorySidebarProps) {
  const { data: versionsData } = useFormVersions(formId);
  const { selectedVersionId, selectVersion, exitVersionView } = useVersionHistorySidebar();
  const restoreMutation = useRestoreVersion();
  const { data: sessionData } = useSession();
  const currentUser = sessionData?.user;

  const versions = versionsData?.versions ?? [];
  const latestVersion = versions[0];

  // Derive effective selection: user selection or first version
  const effectiveVersionId = selectedVersionId ?? versions[0]?.id ?? null;

  const handleSelectVersion = (versionId: string) => {
    selectVersion(versionId);
  };

  const handleRestore = async () => {
    if (!effectiveVersionId) return;

    try {
      await restoreMutation.mutateAsync({
        formId,
        versionId: effectiveVersionId,
      });
      toast.success("Version restored. Publish again to make it live.");
      exitVersionView();
    } catch {
      toast.error("Failed to restore version");
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

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Sidebar Header */}
      <SidebarHeader className="px-4 h-14 border-b flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Version history</span>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Current Version */}
        <div className="px-4 py-3 shrink-0">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Current version
          </div>
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50 border">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser?.image ?? undefined} alt={currentUser?.name} />
              <AvatarFallback className="text-xs">
                {currentUser?.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatTime(new Date().toISOString())}
              </span>
            </div>
          </div>
        </div>

        {/* Version List */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-auto">
            {versions.length} published version
            {versions.length !== 1 ? "s" : ""}
          </SidebarGroupLabel>

          <SidebarGroupContent className="px-2">
            <div className="space-y-1">
              {versions.map((version, index) => (
                <Button
                  key={version.id}
                  variant="ghost"
                  onClick={() => handleSelectVersion(version.id)}
                  className={cn(
                    "w-full px-3 py-3 h-auto flex-col items-start justify-start group",
                    effectiveVersionId === version.id
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">
                      {index === 0
                        ? formatTime(version.publishedAt)
                        : formatDateTime(version.publishedAt)}
                    </span>
                    {version.id === latestVersion?.id && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={version.publishedBy.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {version.publishedBy.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {version.publishedBy.name}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Restore Action */}
      <SidebarFooter className="p-4 border-t bg-muted/5">
        <Button
          onClick={handleRestore}
          disabled={!effectiveVersionId || restoreMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          size="lg"
        >
          {restoreMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Restore
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
