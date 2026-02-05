import { format } from "date-fns";
import { HelpCircle, Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFormVersions,
  useRestoreVersion,
} from "@/hooks/use-form-versions";
import { useVersionHistorySidebar } from "@/hooks/use-version-history-sidebar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface VersionHistorySidebarProps {
  formId: string;
}

export function VersionHistorySidebar({ formId }: VersionHistorySidebarProps) {
  const { data: versionsData } = useFormVersions(formId);
  const { selectedVersionId, selectVersion, setIsOpen, exitVersionView } =
    useVersionHistorySidebar();
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

  const handleClose = () => {
    setIsOpen(false);
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
    <div className="flex flex-col h-full bg-background border-l">
      {/* Sidebar Header */}
      <div className="px-4 h-14 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Version history</span>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Current Version */}
      <div className="px-4 py-3 shrink-0">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Current version
        </div>
        <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50 border">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={currentUser?.image ?? undefined}
              alt={currentUser?.name}
            />
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
      <ScrollArea className="flex-1">
        <div className="py-2">
          <div className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {versions.length} published version
            {versions.length !== 1 ? "s" : ""}
          </div>

          <div className="space-y-1 px-2">
            {versions.map((version, index) => (
              <button
                key={version.id}
                type="button"
                onClick={() => handleSelectVersion(version.id)}
                className={cn(
                  "w-full px-3 py-3 text-left rounded-md transition-colors group",
                  effectiveVersionId === version.id
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    : "hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between">
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
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Restore Action */}
      <div className="p-4 border-t bg-muted/5 mt-auto">
        <Button
          onClick={handleRestore}
          disabled={!effectiveVersionId || restoreMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          size="lg"
        >
          {restoreMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Restore
        </Button>
      </div>
    </div>
  );
}
