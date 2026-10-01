"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Asked once per page load: leagues open once and then stay open. */
let cached: Promise<boolean> | null = null;

function fetchOpen(): Promise<boolean> {
  cached ??= Promise.resolve(getSupabaseBrowserClient().rpc("leagues_open")).then(
    ({ data, error }) => !error && data === true,
    () => false,
  );
  return cached;
}

/**
 * Whether to show Leagues to this learner: signed in, and leagues have opened (the first week
 * enough learners played). Guests never see it, since leagues need an account.
 */
export function useLeaguesOpen(): boolean {
  const { auth, available } = useAuth();
  const signedIn = available && auth.status === "signed-in";
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void fetchOpen().then((value) => {
      if (live) setOpen(value);
    });
    return () => {
      live = false;
    };
  }, [signedIn]);
  return signedIn && open;
}
