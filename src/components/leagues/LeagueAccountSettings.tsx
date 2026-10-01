"use client";

import { useEffect, useState } from "react";
import { getMyLeagueAction, type MyLeague } from "@/app/actions/leagues";
import { useLeaguesOpen } from "@/lib/leagues/useLeaguesOpen";
import { LeagueSettings } from "./LeagueSettings";

/** The leaderboard settings on /account, once leagues have opened. */
export function LeagueAccountSettings({ className }: { className: string }) {
  const open = useLeaguesOpen();
  const [player, setPlayer] = useState<MyLeague["player"] | null>(null);
  useEffect(() => {
    if (!open) return;
    getMyLeagueAction().then((league) => setPlayer(league.player), console.error);
  }, [open]);
  if (!open || !player) return null;
  return <LeagueSettings className={className} handle={player.handle} showOnLeaderboards={player.showOnLeaderboards} />;
}
