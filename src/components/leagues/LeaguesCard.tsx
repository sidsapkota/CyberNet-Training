"use client";

import { useEffect, useState } from "react";
import { getMyLeagueAction, type MyLeague } from "@/app/actions/leagues";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRightIcon, SignInIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { leagueCardState, myStanding } from "@/lib/leagues/card";
import { leagueName, TIER_NAMES, TIERS } from "@/lib/leagues/tiers";
import { useLeaguesStatus } from "@/lib/leagues/useLeaguesOpen";
import { timeLeft } from "@/lib/leagues/week";
import { TierBadge, TierLabel } from "./TierBadge";

const LADDER = TIERS.map((t) => TIER_NAMES[t]).join(", ");

/**
 * The dashboard's leagues panel. While leagues are closed: "Leagues open soon", with the Packet badge
 * and how leagues work, and no counts, other learners or empty leaderboard (it loads no league data
 * at all). Once they open it becomes the learner's league card by itself. Guests are invited to make
 * a free account either way.
 */
export function LeaguesCard({ className = "" }: { className?: string }) {
  const { auth, available } = useAuth();
  const status = useLeaguesStatus();
  const state = leagueCardState(available, auth.status === "signed-in", status);
  if (state === "hidden") return null;
  return (
    <section aria-labelledby="leagues-card-title" className={`${className} p-5`}>
      {state === "loading" ? (
        <div className="grid min-h-28 place-items-center">
          <NetworkMark mode="loading" className="size-12" label="Loading leagues" />
        </div>
      ) : state === "open" ? (
        <LeagueNow />
      ) : (
        <LeaguesSoon guest={state === "soon-guest" || state === "open-guest"} open={state === "open-guest"} />
      )}
    </section>
  );
}

/** Closed (or a guest): how leagues work, and nothing fetched. */
function LeaguesSoon({ guest, open }: { guest: boolean; open: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <TierBadge tier="packet" className="size-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 id="leagues-card-title" className="text-title font-semibold">
          Weekly leagues
        </h2>
        <p className="mt-1 text-ink-muted">
          Compete with up to 30 learners each week. Top players move up a tier:{" "}
          <span className="text-ink">{LADDER}</span>.
        </p>
        <p className="mt-2 font-semibold">
          {open ? "Leagues are open. Make a free account to join." : "Leagues open soon. Earn XP now to be ready."}
        </p>
        <p className="mt-1 text-small text-ink-muted">
          Everyone starts in <TierLabel tier="packet" className="align-middle font-semibold text-ink" badgeClassName="size-5" />.
        </p>
      </div>
      {guest && (
        <ButtonLink href="/login?next=/" className="shrink-0">
          <SignInIcon className="size-5" /> Create a free account
        </ButtonLink>
      )}
    </div>
  );
}

/** Open, signed in: your tier, your place this week, and the way in. */
function LeagueNow() {
  const [league, setLeague] = useState<MyLeague | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    getMyLeagueAction().then(setLeague, (error: unknown) => {
      console.error(error);
      setFailed(true);
    });
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  if (failed) {
    return (
      <div className="flex items-center gap-4">
        <NetworkMark mode="dim" className="size-12" />
        <div>
          <h2 id="leagues-card-title" className="text-title font-semibold">
            Your league
          </h2>
          <p className="text-ink-muted">Couldn&apos;t load your league just now.</p>
        </div>
      </div>
    );
  }
  if (!league) {
    return (
      <div className="grid min-h-28 place-items-center">
        <NetworkMark mode="loading" className="size-12" label="Loading your league" />
      </div>
    );
  }
  const { tier } = league.player;
  const me = myStanding(league.standings);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <TierBadge tier={tier} className="size-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 id="leagues-card-title" className="text-title font-semibold">
          {leagueName(tier)}
        </h2>
        {me ? (
          <p className="mt-1 text-ink-muted">
            You&apos;re <span className="font-mono font-semibold text-ink">#{me.rank}</span> this week with{" "}
            <span className="font-mono font-semibold text-accent-ink">{me.weeklyXp} XP</span>.
          </p>
        ) : (
          <p className="mt-1 text-ink-muted">Earn XP this week to join a league.</p>
        )}
        {now !== null && (
          <p className="mt-1 text-small text-ink-muted">
            Ends in <span className="font-mono font-semibold text-ink">{timeLeft(now, league.week)}</span>
          </p>
        )}
      </div>
      <ButtonLink href="/leagues" className="shrink-0">
        See your league <ArrowRightIcon className="size-5" />
      </ButtonLink>
    </div>
  );
}
