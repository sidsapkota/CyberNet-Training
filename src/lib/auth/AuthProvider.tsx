"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { mergeGuestProgressAction } from "@/app/actions/progress";
import { LocalStorageProgressStore } from "@/lib/progress/localStorageProgressStore";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";
import type { ProgressStore } from "@/lib/progress/ProgressStore";
import { hasAnyProgress } from "@/lib/progress/state";
import { SupabaseProgressStore } from "@/lib/progress/supabaseProgressStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | {
      status: "signed-in";
      userId: string;
      email: string | null;
      /** The public username (null until chosen). */
      username: string | null;
      /** The avatar outfit: item ids from src/lib/rewards/items.ts, one per slot. */
      outfit: string[];
      /** Confirmed 13 or older (accounts are 13+). Unconfirmed accounts see a one-time prompt. */
      ageConfirmed: boolean;
    };

interface AuthContextValue {
  auth: AuthState;
  /** False when Supabase isn't configured: the app runs guest-only. */
  available: boolean;
  /** Re-reads the profile (username and age confirmation) after changing it. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase is usable when its public env vars are set. Same answer on server and client. */
function supabaseConfigured(): boolean {
  try {
    getSupabaseEnv();
    return true;
  } catch {
    return false; // env vars missing: the app runs guest-only
  }
}

async function loadProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ username: string | null; outfit: string[]; ageConfirmed: boolean }> {
  const { data } = await client.from("profiles").select("username, outfit, age_confirmed").eq("id", userId).maybeSingle();
  return { username: data?.username ?? null, outfit: data?.outfit ?? [], ageConfirmed: data?.age_confirmed ?? false };
}

/**
 * Auth state for the whole app, and the progress store that goes with it:
 * - guests: the localStorage store, exactly as before;
 * - signed in: first merge this browser's guest progress into the account (server-side), clear it
 *   locally, then switch to the Supabase store.
 * UI identity comes from `onAuthStateChange`; anything that writes is verified again on the server.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // The browser client is only created in effects and handlers, never during (server) render.
  const [available] = useState(supabaseConfigured);
  const [guestStore] = useState(() => new LocalStorageProgressStore());
  const [auth, setAuth] = useState<AuthState>(available ? { status: "loading" } : { status: "guest" });
  const [accountStore, setAccountStore] = useState<{ userId: string; store: ProgressStore } | null>(null);

  useEffect(() => {
    if (!available) return;
    const client = getSupabaseBrowserClient();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setAuth({ status: "guest" });
        return;
      }
      // Defer Supabase calls out of the callback (supabase-js recommends not awaiting inside it).
      setTimeout(() => {
        void loadProfile(client, user.id).then(({ username, outfit, ageConfirmed }) =>
          setAuth((current) =>
            current.status === "signed-in" &&
            current.userId === user.id &&
            current.username === username &&
            current.outfit.join() === outfit.join() &&
            current.ageConfirmed === ageConfirmed
              ? current
              : { status: "signed-in", userId: user.id, email: user.email ?? null, username, outfit, ageConfirmed },
          ),
        );
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [available]);

  const userId = auth.status === "signed-in" ? auth.userId : null;
  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseBrowserClient();
    let cancelled = false;
    void (async () => {
      const local = await guestStore.getSnapshot();
      if (hasAnyProgress(local) || local.preferences.mode !== "path") {
        try {
          await mergeGuestProgressAction(local);
          guestStore.clear();
        } catch (error) {
          // Keep the guest progress so the next sign-in can try again.
          console.error("Couldn't merge guest progress", error);
        }
      }
      if (!cancelled) setAccountStore({ userId, store: new SupabaseProgressStore(client, userId) });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, guestStore]);

  const refreshProfile = useCallback(async () => {
    if (auth.status !== "signed-in") return;
    const profile = await loadProfile(getSupabaseBrowserClient(), auth.userId);
    setAuth({ ...auth, ...profile });
  }, [auth]);

  const signOut = useCallback(async () => {
    if (available) await getSupabaseBrowserClient().auth.signOut();
  }, [available]);

  let store: ProgressStore | null;
  if (auth.status === "guest") store = guestStore;
  else if (auth.status === "signed-in" && accountStore?.userId === auth.userId) store = accountStore.store;
  else store = null; // still working out who's here, or merging

  return (
    <AuthContext.Provider value={{ auth, available, refreshProfile, signOut }}>
      <ProgressProvider store={store}>{children}</ProgressProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
