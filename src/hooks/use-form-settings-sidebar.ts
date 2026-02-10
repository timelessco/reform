import type { SettingsTab } from "./use-editor-sidebar";
import { useEditorSidebar } from "./use-editor-sidebar";

export function useFormSettingsSidebar() {
  const { activeSidebar, settingsTab, setSettingsTab, toggleSidebar, setActiveSidebar } =
    useEditorSidebar();

  const isOpen = activeSidebar === "settings";

  return {
    isOpen,
    activeTab: settingsTab,
    setIsOpen: (open: boolean) => setActiveSidebar(open ? "settings" : null),
    setActiveTab: setSettingsTab,
    toggle: (tab?: SettingsTab) => toggleSidebar("settings", tab),
    openTab: (tab: "integrations" | "settings") => setSettingsTab(tab),
  };
}
