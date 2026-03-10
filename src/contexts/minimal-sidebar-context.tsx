import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";

interface MinimalSidebarContextType {
  isPinned: boolean;
  setIsPinned: (value: boolean) => void;
  isHovered: boolean;
  setIsHovered: (value: boolean) => void;
  isVisible: boolean;
  togglePin: () => void;
  isInboxOpen: boolean;
  setIsInboxOpen: (value: boolean) => void;
}

const MinimalSidebarContext = createContext<
  MinimalSidebarContextType | undefined
>(undefined);

export function MinimalSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const isVisible = isPinned || isHovered;

  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev);
  }, []);

  return (
    <MinimalSidebarContext.Provider
      value={{
        isPinned,
        setIsPinned,
        isHovered,
        setIsHovered,
        isVisible,
        togglePin,
        isInboxOpen,
        setIsInboxOpen,
      }}
    >
      {children}
    </MinimalSidebarContext.Provider>
  );
}

export function useMinimalSidebar() {
  const context = useContext(MinimalSidebarContext);
  if (context === undefined) {
    throw new Error(
      "useMinimalSidebar must be used within a MinimalSidebarProvider",
    );
  }
  return context;
}

function useMinimalSidebarSafe() {
  return useContext(MinimalSidebarContext);
}
