import { useCallback } from "react";
import { useEditorSidebar } from "./use-editor-sidebar";

export function useVersionHistorySidebar() {
  const {
    activeSidebar,
    toggleSidebar,
    setActiveSidebar,
    selectedVersionId,
    selectVersion,
    exitVersionView,
  } = useEditorSidebar();

  const isOpen = activeSidebar === "history";

  // Derived: viewing a version when one is selected
  const isViewingVersion = selectedVersionId !== null;

  // Wrapper that resets state when closing
  const handleSetIsOpen = useCallback((open: boolean) => {
    if (!open) {
      exitVersionView();
    }
    setActiveSidebar(open ? "history" : null);
  }, [setActiveSidebar, exitVersionView]);

  return {
    isOpen,
    selectedVersionId,
    isViewingVersion,
    setIsOpen: handleSetIsOpen,
    selectVersion,
    exitVersionView,
    toggle: () => toggleSidebar("history"),
  };
}
