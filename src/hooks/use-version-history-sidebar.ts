import { useSyncExternalStore } from "react";

type VersionHistorySidebarState = {
  isOpen: boolean;
  selectedVersionId: string | null;
  isViewingVersion: boolean;
};

const listeners = new Set<() => void>();
let state: VersionHistorySidebarState = {
  isOpen: false,
  selectedVersionId: null,
  isViewingVersion: false,
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
    if (!isOpen) {
      // Reset to live editing when closing
      state = { ...state, selectedVersionId: null, isViewingVersion: false };
    }
    notify();
  },
  selectVersion: (versionId: string | null) => {
    state = {
      ...state,
      selectedVersionId: versionId,
      isViewingVersion: versionId !== null,
    };
    notify();
  },
  exitVersionView: () => {
    state = { ...state, selectedVersionId: null, isViewingVersion: false };
    notify();
  },
  toggle: () => {
    const isOpen = !state.isOpen;
    state = { ...state, isOpen };
    if (!isOpen) {
      state = { ...state, selectedVersionId: null, isViewingVersion: false };
    }
    notify();
  },
};

const serverSnapshot: VersionHistorySidebarState = {
  isOpen: false,
  selectedVersionId: null,
  isViewingVersion: false,
};

export function useVersionHistorySidebar() {
  const currentState = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => serverSnapshot,
  );

  return {
    ...currentState,
    setIsOpen: store.setIsOpen,
    selectVersion: store.selectVersion,
    exitVersionView: store.exitVersionView,
    toggle: store.toggle,
  };
}
