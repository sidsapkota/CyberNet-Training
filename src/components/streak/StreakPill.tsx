"use client";

import Link from "next/link";
import { streakSummary } from "@/lib/progress/streak";
import { useDaily } from "@/lib/progress/useDaily";
import { StreakIcon } from "./StreakIcon";

/**
 * The streak in the header, next to XP: the node chain and the number of days. Lit once today's
 * goal is met. A streak is progress, so it's cyan (as text: accent-ink); no streak is muted.
 */
export function StreakPill() {
  const daily = useDaily();
  const days = daily?.streak.current;
  const lit = daily?.today.met ?? false;
  return (
    <Link
      href="/"
      aria-label={daily ? `${streakSummary(daily)} Open the dashboard.` : "Streak, on the dashboard"}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-control border border-line bg-surface px-2.5 max-[399px]:px-2 transition-colors hover:border-line-strong font-mono text-small font-semibold tabular-nums ${
        days ? "text-accent-ink" : "text-ink-muted"
      }`}
    >
      <StreakIcon lit={lit} className="size-4" />
      <span>{days ?? "–"}</span>
    </Link>
  );
}
