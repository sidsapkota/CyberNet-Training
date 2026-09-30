"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { LocalStorageProgressStore } from "./localStorageProgressStore";
import type { ProgressStore } from "./ProgressStore";
import type { ProgressSnapshot } from "./types";

interface ProgressContextValue {
  store: ProgressStore;
  /** null until the first read completes (always null during SSR). */
  snapshot: ProgressSnapshot | null;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Provides progress to the app. Pass a different `store` (e.g. Supabase-backed)
 * to swap persistence without touching any component.
 */
export function ProgressProvider({
  children,
  store: providedStore,
}: {
  children: ReactNode;
  store?: ProgressStore;
}) {
  const [store] = useState<ProgressStore>(() => providedStore ?? new LocalStorageProgressStore());
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = store.subscribe((next) => {
      if (active) setSnapshot(next);
    });
    void store.getSnapshot().then((initial) => {
      if (active) setSnapshot(initial);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store]);

  return <ProgressContext.Provider value={{ store, snapshot }}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside <ProgressProvider>");
  return value;
}
