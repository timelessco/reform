import type { SettingsTab } from "./use-editor-sidebar";
import { useEditorSidebar } from "./use-editor-sidebar";

export function useFormSettingsSidebar() {
  const { activeSidebar, settingsTab, openSettings, toggleSidebar, closeSidebar } =
    useEditorSidebar();

  const isOpen = activeSidebar === "settings";

  return {
    isOpen,
    activeTab: settingsTab,
    setIsOpen: (open: boolean) => (open ? openSettings() : closeSidebar()),
    setActiveTab: (tab: SettingsTab) => openSettings(tab),
    toggle: (tab?: SettingsTab) => toggleSidebar("settings", tab),
    openTab: (tab: "integrations" | "settings") => openSettings(tab),
  };
}
