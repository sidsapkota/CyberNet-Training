"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMyProAction, type MyPro } from "@/app/actions/pro";
import { useAuth } from "@/lib/auth/AuthProvider";
import { maxFreezesOn } from "./entitlement";

/**
 * The learner's Pro, for the UI only: badges, the upgrade sheet, /account and the extra streak
 * freeze. It never decides access. The server checks again for every Pro lesson (the content
 * isn't sent without it) and every XP write. Guests never have Pro.
 */
export type ProState = { loading: true } | ({ loading: false } & MyPro);

interface ProContextValue {
  pro: ProState;
  hasPro: boolean;
  /** Freeze cap per day (3 on days with Pro), for streaks. */
  maxFreezesOn: (day: string) => number;
  refresh: () => Promise<void>;
}

const GUEST: MyPro = { hasPro: false, status: { kind: "none", hadSubscription: false }, intervals: [], trialEligible: true, available: true };

const ProContext = createContext<ProContextValue | null>(null);

export function ProProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  const userId = auth.status === "signed-in" ? auth.userId : null;
  const [loaded, setLoaded] = useState<{ userId: string; pro: MyPro } | null>(null);

  const fetchPro = useCallback(
    (id: string) =>
      getMyProAction().then(
        (pro) => ({ userId: id, pro }),
        (error: unknown) => {
          console.error(error);
          return { userId: id, pro: GUEST };
        },
      ),
    [],
  );

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void fetchPro(userId).then((result) => {
      if (live) setLoaded(result);
    });
    return () => {
      live = false;
    };
  }, [userId, fetchPro]);

  const pro: ProState =
    auth.status === "loading" || (userId !== null && loaded?.userId !== userId)
      ? { loading: true }
      : { loading: false, ...(userId ? loaded!.pro : GUEST) };
  const value = useMemo<ProContextValue>(
    () => ({
      pro,
      hasPro: !pro.loading && pro.hasPro,
      maxFreezesOn: maxFreezesOn(pro.loading ? [] : pro.intervals),
      refresh: async () => {
        if (userId) setLoaded(await fetchPro(userId));
      },
    }),
    // `pro` is rebuilt each render; its identity only matters through these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pro.loading, loaded, userId, fetchPro],
  );
  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProContextValue {
  const value = useContext(ProContext);
  if (!value) throw new Error("usePro must be used inside <ProProvider>");
  return value;
}
