import { useSyncExternalStore } from "react";

export type SidebarType = "settings" | "share" | "history" | null;
export type SettingsTab = "integrations" | "settings";
export type ShareTab = "share" | "summary";

type EditorSidebarState = {
    activeSidebar: SidebarType;
    settingsTab: SettingsTab;
    shareTab: ShareTab;
};

const listeners = new Set<() => void>();
let state: EditorSidebarState = {
    activeSidebar: null,
    settingsTab: "settings",
    shareTab: "share",
};

function notify() {
    listeners.forEach((l) => l());
}

const store = {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    setActiveSidebar: (sidebar: SidebarType) => {
        state = { ...state, activeSidebar: sidebar };
        notify();
    },
    toggleSidebar: (sidebar: SidebarType, tab?: SettingsTab | ShareTab) => {
        const isAlreadyOpen = state.activeSidebar === sidebar;
        const isSwitchingTab =
            isAlreadyOpen &&
            tab &&
            ((sidebar === "settings" && state.settingsTab !== tab) ||
                (sidebar === "share" && state.shareTab !== tab));

        // If same sidebar is open on the same tab (or no tab given) → close
        // If same sidebar but different tab → just switch tab, keep open
        const nextSidebar = isAlreadyOpen && !isSwitchingTab ? null : sidebar;
        const updates: Partial<EditorSidebarState> = { activeSidebar: nextSidebar };
        if (nextSidebar && tab) {
            if (nextSidebar === "settings") {
                updates.settingsTab = tab as SettingsTab;
            } else if (nextSidebar === "share") {
                updates.shareTab = tab as ShareTab;
            }
        }
        state = { ...state, ...updates };
        notify();
    },
    setSettingsTab: (tab: SettingsTab) => {
        state = { ...state, settingsTab: tab, activeSidebar: "settings" };
        notify();
    },
    setShareTab: (tab: ShareTab) => {
        state = { ...state, shareTab: tab, activeSidebar: "share" };
        notify();
    },
    closeSidebar: () => {
        state = { ...state, activeSidebar: null };
        notify();
    },
    resetSidebar: () => {
        state = { activeSidebar: null, settingsTab: "settings", shareTab: "share" };
        notify();
    },
};

const serverSnapshot: EditorSidebarState = {
    activeSidebar: null,
    settingsTab: "settings",
    shareTab: "share",
};

export function useEditorSidebar() {
    const currentState = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
        () => serverSnapshot,
    );

    return {
        ...currentState,
        setActiveSidebar: store.setActiveSidebar,
        toggleSidebar: store.toggleSidebar,
        setSettingsTab: store.setSettingsTab,
        setShareTab: store.setShareTab,
        closeSidebar: store.closeSidebar,
        resetSidebar: store.resetSidebar,
    };
}
