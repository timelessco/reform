import { XIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useEditorSidebar } from "@/hooks/use-editor-sidebar";
import { SettingsContent } from "@/routes/_authenticated/workspace/$workspaceId/form-builder/$formId/settings";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";

interface FormSettingsSidebarProps {
  formId: string;
  isLocal?: boolean;
}

export function FormSettingsSidebar({ formId, isLocal }: FormSettingsSidebarProps) {
  const { closeSidebar } = useEditorSidebar();

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="w-full h-full border-none animate-in slide-in-from-right duration-300 ease-in-out"
    >
      <SidebarHeader className="pt-2 pb-1 pl-1 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground px-2.5">Settings</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={closeSidebar}
            aria-label="Close settings"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="p-2">
          <SettingsContent formId={formId} isLocal={isLocal} />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
