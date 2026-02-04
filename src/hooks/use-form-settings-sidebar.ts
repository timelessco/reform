import { useSyncExternalStore } from "react";

type ActiveTab = "integrations" | "settings";

type FormSettingsSidebarState = {
  isOpen: boolean;
  activeTab: ActiveTab;
};

const listeners = new Set<() => void>();
let state: FormSettingsSidebarState = {
  isOpen: false,
  activeTab: "settings",
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
  setIsOpen: (isOpen: boolean) => {
    state = { ...state, isOpen };
    notify();
  },
  setActiveTab: (activeTab: ActiveTab) => {
    state = { ...state, activeTab };
    notify();
  },
  toggle: () => {
    state = { ...state, isOpen: !state.isOpen };
    notify();
  },
  openTab: (tab: ActiveTab) => {
    state = { ...state, isOpen: true, activeTab: tab };
    notify();
  },
};

const serverSnapshot: FormSettingsSidebarState = {
  isOpen: false,
  activeTab: "settings",
};

export function useFormSettingsSidebar() {
  const currentState = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => serverSnapshot,
  );

  return {
    ...currentState,
    setIsOpen: store.setIsOpen,
    setActiveTab: store.setActiveTab,
    toggle: store.toggle,
    openTab: store.openTab,
  };
}
