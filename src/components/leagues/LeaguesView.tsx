"use client";

import { Avatar } from "@/components/rewards/Avatar";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getMyLeagueAction, markResultSeenAction, type MyLeague, reportHandleAction, type StandingRow } from "@/app/actions/leagues";
import { NetworkMark } from "@/components/network/NetworkMark";
import { Button } from "@/components/ui/Button";
import { DemotionIcon, ProIcon, PromotionIcon, ReportIcon, XIcon } from "@/components/ui/icons";
import type { CourseOutline } from "@/lib/content/schema";
import { PROMOTE_MIN_XP } from "@/lib/leagues/config";
import { zoneOf, zoneSizes } from "@/lib/leagues/settle";
import { leagueName, TIER_NAMES } from "@/lib/leagues/tiers";
import { resetInZone, timeLeft } from "@/lib/leagues/week";
import { browserTimeZone } from "@/lib/progress/daily";
import { learnerStats } from "@/lib/progress/activity";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { useDaily } from "@/lib/progress/useDaily";
import { usePro } from "@/lib/pro/ProProvider";
import { staggerDelay } from "@/lib/motion";
import { LeagueResult } from "./LeagueResult";
import { LeagueSettings } from "./LeagueSettings";
import { PlayerCard } from "./PlayerCard";
import { TierBadge } from "./TierBadge";

const panel = "rounded-card border border-line bg-surface p-5 shadow-card";

export function LeaguesView({ courses }: { courses: CourseOutline[] }) {
  const [league, setLeague] = useState<MyLeague | null>(null);
  const [failed, setFailed] = useState(false);
  const [showResult, setShowResult] = useState(true);

  const load = useCallback(() => {
    getMyLeagueAction().then(setLeague, (error: unknown) => {
      console.error(error);
      setFailed(true);
    });
  }, []);
  useEffect(load, [load]);

  if (failed) {
    return (
      <div className="grid min-h-[50dvh] place-items-center text-center">
        <div>
          <NetworkMark mode="dim" className="mx-auto size-20" />
          <p className="mt-4 text-ink-muted">Couldn&apos;t load your league. Please try again.</p>
        </div>
      </div>
    );
  }
  if (!league) {
    return (
      <div className="grid min-h-[50dvh] place-items-center">
        <NetworkMark mode="loading" className="size-20" label="Loading your league" />
      </div>
    );
  }
  if (league.result && showResult) {
    const week = league.result.week;
    return (
      <LeagueResult
        result={league.result}
        onDone={() => {
          setShowResult(false);
          void markResultSeenAction(week).catch(console.error);
        }}
      />
    );
  }
  return <League league={league} courses={courses} reload={load} />;
}

function League({ league, courses, reload }: { league: MyLeague; courses: CourseOutline[]; reload: () => void }) {
  const { player } = league;
  // Hidden learners see their league but aren't in it: leave them out and number the rest.
  const standings = player.showOnLeaderboards
    ? league.standings
    : league.standings.filter((r) => !r.isMe).map((r, i) => ({ ...r, rank: i + 1 }));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const [open, setOpen] = useState<StandingRow | null>(null);
  const me = standings.find((r) => r.isMe);
  const ranked = standings.length;
  const { up, down } = zoneSizes(ranked, player.tier);

  return (
    <div className="mx-auto grid max-w-wide gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <header className="flex items-center gap-4">
          <TierBadge tier={player.tier} className="size-16 shrink-0 sm:size-20" />
          <div className="min-w-0">
            <h1 className="text-headline font-semibold">{leagueName(player.tier)}</h1>
            <p className="text-small text-ink-muted">
              Ends in <span className="font-mono font-semibold text-ink">{timeLeft(now, league.week)}</span>
            </p>
          </div>
        </header>
        <p className="mt-3 text-small text-ink-muted">
          Leagues reset every Monday at 12:00 am Sydney time
          {browserTimeZone() !== league.timeZone && <> ({resetInZone(league.week, browserTimeZone())} where you are)</>}. The top {up || "few"}{" "}
          move up and the bottom {down || "few"} move down. Earn {PROMOTE_MIN_XP}+ XP to move up.
        </p>

        {!player.showOnLeaderboards && (
          <p role="status" className="mt-4 rounded-control border border-line-strong bg-surface-raised px-4 py-3 text-small">
            You&apos;re hidden from leaderboards, so you aren&apos;t ranked and your tier stays as it is. Turn it back on below.
          </p>
        )}

        {ranked === 0 ? (
          <div className={`${panel} mt-6 text-center`}>
            <NetworkMark mode="dim" className="mx-auto size-16" />
            <p className="mt-3 font-semibold">Earn XP to join this week&apos;s league</p>
            <p className="mt-1 text-small text-ink-muted">Finish a card or a lesson and you&apos;ll be placed with learners like you.</p>
          </div>
        ) : (
          <Standings rows={standings} tier={player.tier} onOpen={setOpen} />
        )}
        {me && <p className="sr-only" aria-live="polite">{`You're ${me.rank} of ${ranked} with ${me.weeklyXp} XP this week.`}</p>}
      </div>

      <aside className="space-y-6">
        <OwnCard handle={player.handle} avatar={player.avatar} tier={player.tier} courses={courses} />
        <LeagueSettings className={panel} showOnLeaderboards={player.showOnLeaderboards} onChange={reload} />
      </aside>

      <PublicCardDialog row={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function OwnCard({ handle, avatar, tier, courses }: { handle: string; avatar: string; tier: MyLeague["player"]["tier"]; courses: CourseOutline[] }) {
  const { snapshot } = useProgress();
  const daily = useDaily();
  const { hasPro } = usePro();
  const stats = snapshot ? learnerStats(snapshot, courses) : null;
  return (
    <PlayerCard
      handle={handle}
      avatar={avatar}
      tier={tier}
      pro={hasPro}
      stats={{ kind: "own", totalXp: stats?.totalXp ?? 0, streak: daily?.streak.current ?? 0, coursesCompleted: stats?.coursesCompleted ?? 0 }}
    />
  );
}

function Standings({ rows, tier, onOpen }: { rows: StandingRow[]; tier: MyLeague["player"]["tier"]; onOpen: (row: StandingRow) => void }) {
  const reduceMotion = useReducedMotion();
  const size = rows.length;
  const { up, down } = zoneSizes(size, tier);
  return (
    <ol aria-label="This week's league" className="mt-6 space-y-1.5">
      {rows.map((row, i) => {
        const zone = zoneOf(row.rank, size, tier, row.weeklyXp);
        const label = `${row.rank}, ${row.isMe ? "you, " : ""}${row.handle}${row.pro ? ", Pro" : ""}, ${row.weeklyXp} XP${zone === "up" ? ", promotion zone" : zone === "down" ? ", demotion zone" : ""}`;
        return (
          <li key={row.handle}>
            {up > 0 && row.rank === up + 1 && <ZoneDivider kind="up" />}
            {down > 0 && row.rank === size - down + 1 && <ZoneDivider kind="down" />}
            <motion.button
              type="button"
              onClick={() => onOpen(row)}
              aria-label={label}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: staggerDelay(i, 0.03) }}
              className={`flex min-h-14 w-full items-center gap-3 rounded-control border px-3 text-left transition-colors hover:bg-surface-raised ${
                row.isMe ? "border-accent-ink bg-accent-soft" : "border-line bg-surface"
              }`}
            >
              <span className="w-7 text-right font-mono font-semibold tabular-nums text-ink-muted">{row.rank}</span>
              {zone === "up" ? (
                <PromotionIcon className="size-4 shrink-0 text-success" />
              ) : zone === "down" ? (
                <DemotionIcon className="size-4 shrink-0 text-danger" />
              ) : (
                <span className="size-4 shrink-0" aria-hidden="true" />
              )}
              <Avatar avatar={row.avatar} pro={row.pro} frame={false} className="size-7" />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {row.handle}
                {row.isMe && <span className="ml-2 text-caption font-semibold text-accent-ink">You</span>}
              </span>
              {/* The full Pro badge is on the card; rows keep the gem so long usernames fit at 360px. */}
              {row.pro && <ProIcon className="size-4 shrink-0 text-ink-muted" />}
              <span className="font-mono font-semibold tabular-nums">
                {row.weeklyXp.toLocaleString("en-AU")} <span className="text-caption text-ink-faint">XP</span>
              </span>
            </motion.button>
          </li>
        );
      })}
    </ol>
  );
}

function ZoneDivider({ kind }: { kind: "up" | "down" }) {
  return (
    <p className={`my-2 flex items-center gap-2 font-mono text-caption tracking-widest uppercase ${kind === "up" ? "text-success" : "text-danger"}`}>
      {kind === "up" ? <PromotionIcon className="size-4" /> : <DemotionIcon className="size-4" />}
      {kind === "up" ? "Promotion zone above" : "Demotion zone below"}
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </p>
  );
}

/** Another learner's public card (handle, tier, weekly XP, Pro), with a report button. */
function PublicCardDialog({ row, onClose }: { row: StandingRow | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (row && !dialog.open) {
      setReporting(false);
      setReason("");
      setMessage(null);
      dialog.showModal();
    } else if (!row && dialog.open) dialog.close();
  }, [row]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-card border border-line bg-canvas p-0 text-ink backdrop:bg-screen/70"
    >
      {row && (
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 id={`${id}-title`} className="font-semibold">
              {row.isMe ? "Your card" : `${row.handle}'s card`}
            </h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="grid size-11 place-items-center rounded-control hover:bg-surface-raised">
              <XIcon className="size-5" />
            </button>
          </div>
          <PlayerCard handle={row.handle} avatar={row.avatar} tier={row.tier} pro={row.pro} stats={{ kind: "public", weeklyXp: row.weeklyXp }} />

          {!row.isMe && !reporting && !message && (
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setReporting(true)}>
              <ReportIcon className="size-5" /> Report this username
            </Button>
          )}
          {!row.isMe && reporting && !message && (
            <form
              className="mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const result = await reportHandleAction(row.handle, reason).catch(() => ({ ok: false as const, error: "Couldn't send that. Please try again." }));
                setBusy(false);
                setMessage(result.ok ? { tone: "ok", text: "Thanks for telling us. We'll take a look." } : { tone: "error", text: result.error });
              }}
            >
              <fieldset>
                <legend className="text-small font-semibold">What&apos;s wrong with this username?</legend>
                {[
                  ["rude", "It's rude or unkind"],
                  ["personal_info", "It shares personal information"],
                  ["pretending", "It pretends to be someone"],
                  ["other", "Something else"],
                ].map(([value, text]) => (
                  <label key={value} className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-surface-raised">
                    <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value!)} className="size-4 accent-[var(--color-accent-ink)]" />
                    <span className="text-small">{text}</span>
                  </label>
                ))}
              </fieldset>
              <Button type="submit" className="mt-3 w-full" disabled={!reason || busy}>
                {busy ? "Sending…" : "Send report"}
              </Button>
            </form>
          )}
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`mt-3 text-small ${message.tone === "error" ? "text-danger" : "text-success"}`}>
              {message.text}
            </p>
          )}
          <p className="mt-3 text-caption text-ink-faint">Only usernames, tiers and this week&apos;s XP are shown to your league. {TIER_NAMES[row.tier]} tier.</p>
        </div>
      )}
    </dialog>
  );
}
