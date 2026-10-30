/**
 * Gates local-draft UI on the IndexedDB collection being open.
 *
 * `indexedDBCollectionOptions` needs an async `createIndexedDB()`, so trees that
 * read or write drafts cannot render until that resolve. Wrapping them here keeps
 * the editor from seeding a duplicate draft row against an empty store, and gives
 * blocked/denied storage a visible, retryable state instead of a blank screen.
 */
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  getLocalFormCollection,
  initLocalFormCollection,
  isLocalFormStorageAvailable,
} from "./form";
import type { LocalFormCollection } from "./form";
import Loader from "@/components/ui/loader";

type GateState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "unavailable" }
  | { status: "error"; error: Error };

export const LocalFormsGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GateState>(() =>
    getLocalFormCollection() ? { status: "ready" } : { status: "loading" },
  );

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (getLocalFormCollection()) return;

    let cancelled = false;

    void initLocalFormCollection()
      .then(() => {
        if (!cancelled) setState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        // No IndexedDB at all (very old browser, hardened privacy mode) is a
        // capability gap, not a transient failure — retrying cannot help.
        setState(
          isLocalFormStorageAvailable()
            ? { status: "error", error: error instanceof Error ? error : new Error(String(error)) }
            : { status: "unavailable" },
        );
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  if (state.status === "ready") return <>{children}</>;

  if (state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  const detail =
    state.status === "unavailable"
      ? "This browser does not expose IndexedDB, so offline drafts cannot be stored."
      : state.error.message;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-foreground">Offline drafts are unavailable</p>
      <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
      >
        Try again
      </button>
    </div>
  );
};

/** The open collection; only valid inside `LocalFormsGate`. */
export const useLocalForms = (): LocalFormCollection => {
  const collection = getLocalFormCollection();

  if (!collection) throw new Error("LocalFormsGate must be mounted before reading local drafts");

  return collection;
};
