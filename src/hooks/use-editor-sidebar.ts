import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { jsx } from "react/jsx-runtime";

type SidebarType = "settings" | "share" | "history" | "customize" | "about" | null;
export type SettingsTab = "integrations" | "settings";
type ShareTab = "share" | "summary";
export type EmbedType = "standard" | "popup" | "fullpage";

type EditorSidebarState = {
  activeSidebar: SidebarType;
  settingsTab: SettingsTab;
  shareTab: ShareTab;
  selectedVersionId: string | null;
};

type EditorSidebarContextValue = {
  activeSidebar: SidebarType;
  settingsTab: SettingsTab;
  shareTab: ShareTab;
  selectedVersionId: string | null;
  isOpen: boolean;
  openSettings: (tab?: SettingsTab) => void;
  openShare: (tab?: ShareTab) => void;
  openVersionHistory: (versionId?: string) => void;
  openCustomize: () => void;
  openAbout: () => void;
  closeSidebar: () => void;
  resetSidebar: () => void;
  toggleSidebar: (sidebar: SidebarType, tab?: SettingsTab | ShareTab) => void;
  selectVersion: (versionId: string | null) => void;
  exitVersionView: () => void;
};

const initialState: EditorSidebarState = {
  activeSidebar: null,
  settingsTab: "settings",
  shareTab: "share",
  selectedVersionId: null,
};

const EditorSidebarContext = createContext<EditorSidebarContextValue | null>(null);

export function EditorSidebarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditorSidebarState>(initialState);

  const openSettings = useCallback((tab?: SettingsTab) => {
    setState((prev) => ({
      ...prev,
      activeSidebar: "settings",
      settingsTab: tab ?? prev.settingsTab,
    }));
  }, []);

  const openShare = useCallback((tab?: ShareTab) => {
    setState((prev) => ({
      ...prev,
      activeSidebar: "share",
      shareTab: tab ?? prev.shareTab,
    }));
  }, []);

  const openVersionHistory = useCallback((versionId?: string) => {
    setState((prev) => ({
      ...prev,
      activeSidebar: "history",
      selectedVersionId: versionId ?? prev.selectedVersionId,
    }));
  }, []);

  const openCustomize = useCallback(() => {
    setState((prev) => ({ ...prev, activeSidebar: "customize" }));
  }, []);

  const openAbout = useCallback(() => {
    setState((prev) => ({ ...prev, activeSidebar: "about" }));
  }, []);

  const toggleSidebar = useCallback((sidebar: SidebarType, tab?: SettingsTab | ShareTab) => {
    setState((prev) => {
      const isAlreadyOpen = prev.activeSidebar === sidebar;
      const isSwitchingTab =
        isAlreadyOpen &&
        tab &&
        ((sidebar === "settings" && prev.settingsTab !== tab) ||
          (sidebar === "share" && prev.shareTab !== tab));

      const nextSidebar = isAlreadyOpen && !isSwitchingTab ? null : sidebar;
      const updates: Partial<EditorSidebarState> = {
        activeSidebar: nextSidebar,
      };
      if (nextSidebar && tab) {
        if (nextSidebar === "settings") {
          updates.settingsTab = tab as SettingsTab;
        } else if (nextSidebar === "share") {
          updates.shareTab = tab as ShareTab;
        }
      }
      return { ...prev, ...updates };
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeSidebar: null,
      selectedVersionId: null,
    }));
  }, []);

  const resetSidebar = useCallback(() => {
    setState(initialState);
  }, []);

  const selectVersion = useCallback((versionId: string | null) => {
    setState((prev) => ({ ...prev, selectedVersionId: versionId }));
  }, []);

  const exitVersionView = useCallback(() => {
    setState((prev) => ({ ...prev, selectedVersionId: null }));
  }, []);

  return jsx(EditorSidebarContext.Provider, {
    value: {
      ...state,
      isOpen: state.activeSidebar !== null,
      openSettings,
      openShare,
      openVersionHistory,
      openCustomize,
      openAbout,
      toggleSidebar,
      closeSidebar,
      resetSidebar,
      selectVersion,
      exitVersionView,
    },
    children,
  });
}

export function useEditorSidebar() {
  const context = useContext(EditorSidebarContext);
  if (!context) {
    throw new Error("useEditorSidebar must be used within an EditorSidebarProvider");
  }
  return context;
}
