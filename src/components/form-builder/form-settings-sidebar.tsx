import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormSettingsSidebar } from "@/hooks/use-form-settings-sidebar";
import { cn } from "@/lib/utils";
import { IntegrationsContent } from "@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/integrations";
import { SettingsContent } from "@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/settings";

interface FormSettingsSidebarProps {
  formId: string;
}

export function FormSettingsSidebar({ formId }: FormSettingsSidebarProps) {
  const { activeTab, setActiveTab, setIsOpen } = useFormSettingsSidebar();

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with tabs */}
      <div className="shrink-0">
        {/* Top row with close button */}
        <div className="px-4 h-12 flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation - underline style like the image */}
        <div className="px-4 flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("integrations")}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative",
              activeTab === "integrations"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Integrations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={cn(
              "pb-3 text-sm font-medium transition-colors relative",
              activeTab === "settings"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b" />

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeTab === "integrations" ? (
            <IntegrationsContent />
          ) : (
            <SettingsContent formId={formId} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
