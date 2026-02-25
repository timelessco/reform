import { Button } from "@/components/ui/button";
import { useFormSettingsSidebar } from "@/hooks/use-form-settings-sidebar";
import { cn } from "@/lib/utils";
import { SettingsContent } from "@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/settings.lazy";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface FormSettingsSidebarProps {
  formId: string;
}

export function FormSettingsSidebar({ formId }: FormSettingsSidebarProps) {
  const { activeTab, setActiveTab } = useFormSettingsSidebar();

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      {/* Header with tabs */}
      <SidebarHeader className="p-0 shrink-0 border-b">
        {/* Tab Navigation - underline style like the image */}
        <div className="px-4 pt-4 flex items-center gap-6">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("settings")}
            data-active={activeTab === "settings"}
            className={cn(
              "pb-3 h-auto rounded-none px-0 text-sm font-medium relative hover:bg-transparent",
              activeTab === "settings"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Settings
          </Button>
        </div>
      </SidebarHeader>

      {/* Tab Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="p-4">
            <SettingsContent formId={formId} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
