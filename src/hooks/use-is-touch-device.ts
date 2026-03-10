import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback, { passive: true });
  return () => window.removeEventListener("resize", callback);
}

function getSnapshot() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

function getServerSnapshot() {
  // Default to false on server
  return false;
}

export function useIsTouchDevice() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
