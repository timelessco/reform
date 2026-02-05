import { useState, useEffect } from "react";
import { useEditorSidebar } from "./use-editor-sidebar";

export function useVersionHistorySidebar() {
  const { activeSidebar, toggleSidebar, setActiveSidebar } = useEditorSidebar();
  const isOpen = activeSidebar === "history";

  // These states are specific to the version history view
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isViewingVersion, setIsViewingVersion] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedVersionId(null);
      setIsViewingVersion(false);
    }
  }, [isOpen]);

  return {
    isOpen,
    selectedVersionId,
    isViewingVersion,
    setIsOpen: (open: boolean) => setActiveSidebar(open ? "history" : null),
    selectVersion: (versionId: string | null) => {
      setSelectedVersionId(versionId);
      setIsViewingVersion(versionId !== null);
    },
    exitVersionView: () => {
      setSelectedVersionId(null);
      setIsViewingVersion(false);
    },
    toggle: () => toggleSidebar("history"),
  };
}
