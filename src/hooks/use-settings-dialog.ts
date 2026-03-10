import { useSyncExternalStore } from "react";

type SettingsTab = "account" | "members" | "ai-features" | "import";

const listeners = new Set<() => void>();
let state = { isOpen: false, activeTab: "account" as SettingsTab };

function emit() {
  listeners.forEach((l) => l());
}

const store = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  open: (tab: SettingsTab = "account") => {
    state = { isOpen: true, activeTab: tab };
    emit();
  },
  close: () => {
    state = { ...state, isOpen: false };
    emit();
  },
  setTab: (tab: SettingsTab) => {
    state = { ...state, activeTab: tab };
    emit();
  },
};

export type { SettingsTab };

export function useSettingsDialog() {
  const current = useSyncExternalStore(store.subscribe, store.getSnapshot, () => ({
    isOpen: false,
    activeTab: "account" as SettingsTab,
  }));
  return {
    ...current,
    open: store.open,
    close: store.close,
    setTab: store.setTab,
  };
}

// For imperative use outside React components
export const settingsDialogStore = store;
