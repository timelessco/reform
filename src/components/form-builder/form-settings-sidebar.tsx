import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { SettingsContent } from "@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/settings";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface FormSettingsSidebarProps {
  formId: string;
  isLocal?: boolean;
}

export function FormSettingsSidebar({ formId, isLocal }: FormSettingsSidebarProps) {
  const { closeSidebar } = useEditorSidebar();

  return (
    <Sidebar
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      <SidebarHeader className="px-4 py-3 shrink-0 border-b flex flex-row items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Settings</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={closeSidebar}
        >
          <X className="h-4 w-4" />
        </Button>
      </SidebarHeader>

      {/* Tab Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="p-4">
            <SettingsContent formId={formId} isLocal={isLocal} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
