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

export type LeaguesStatus = "loading" | "closed" | "open";

function useOpenFlag(enabled: boolean): boolean | null {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetchOpen().then((value) => {
      if (live) setOpen(value);
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return open;
}

/**
 * Whether leagues have opened (the first week enough learners played), for anyone, guests
 * included (`leagues_open()` is a public yes/no). "loading" until known, so nothing flips from
 * "opening soon" to open on screen. Without accounts on this copy, leagues are closed.
 */
export function useLeaguesStatus(): LeaguesStatus {
  const { available } = useAuth();
  const open = useOpenFlag(available);
  if (!available) return "closed";
  return open === null ? "loading" : open ? "open" : "closed";
}

/**
 * Whether to show Leagues to this learner: signed in, and leagues have opened (the first week
 * enough learners played). Guests never see it, since leagues need an account, and aren't asked.
 */
export function useLeaguesOpen(): boolean {
  const { auth, available } = useAuth();
  const signedIn = available && auth.status === "signed-in";
  return useOpenFlag(signedIn) === true && signedIn;
}
