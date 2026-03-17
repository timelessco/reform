import { useCallback } from "react";
import { useEditorSidebar } from "./use-editor-sidebar";

export const useVersionHistorySidebar = () => {
  const {
    activeSidebar,
    toggleSidebar,
    openVersionHistory,
    closeSidebar,
    selectedVersionId,
    selectVersion,
    exitVersionView,
  } = useEditorSidebar();

  const isOpen = activeSidebar === "history";

  // Derived: viewing a version when one is selected
  const isViewingVersion = selectedVersionId !== null;

  // Wrapper that resets state when closing
  const handleSetIsOpen = useCallback(
    (open: boolean) => {
      if (open) {
        openVersionHistory();
      } else {
        exitVersionView();
        closeSidebar();
      }
    },
    [openVersionHistory, closeSidebar, exitVersionView],
  );

  return {
    isOpen,
    selectedVersionId,
    isViewingVersion,
    setIsOpen: handleSetIsOpen,
    selectVersion,
    exitVersionView,
    toggle: () => toggleSidebar("history"),
  };
};
