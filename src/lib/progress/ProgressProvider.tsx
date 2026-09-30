"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { LocalStorageProgressStore } from "./localStorageProgressStore";
import type { ProgressStore } from "./ProgressStore";
import type { ProgressSnapshot } from "./types";

interface ProgressContextValue {
  store: ProgressStore;
  /** null until the first read completes (always null during SSR, and while the store changes). */
  snapshot: ProgressSnapshot | null;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Provides progress to the app. Components only ever call `useProgress()`, so the store behind it
 * can change (guest localStorage ↔ signed-in Supabase) without them knowing.
 * - `store` omitted: a localStorage store (tests, the dev playground).
 * - `store={null}`: not ready yet (e.g. while signing in); `snapshot` stays null.
 */
export function ProgressProvider({
  children,
  store: providedStore,
}: {
  children: ReactNode;
  store?: ProgressStore | null;
}) {
  const [fallback] = useState<ProgressStore>(() => new LocalStorageProgressStore());
  const store = providedStore === undefined ? fallback : providedStore;
  // The snapshot is tagged with the store it came from, so a store change shows "loading"
  // until the new store has been read.
  const [loaded, setLoaded] = useState<{ store: ProgressStore; snapshot: ProgressSnapshot } | null>(null);

  useEffect(() => {
    if (!store) return;
    let active = true;
    const unsubscribe = store.subscribe((next) => {
      if (active) setLoaded({ store, snapshot: next });
    });
    void store.getSnapshot().then((initial) => {
      if (active) setLoaded({ store, snapshot: initial });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store]);

  const snapshot = store && loaded?.store === store ? loaded.snapshot : null;
  return (
    <ProgressContext.Provider value={{ store: store ?? fallback, snapshot }}>{children}</ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside <ProgressProvider>");
  return value;
}
