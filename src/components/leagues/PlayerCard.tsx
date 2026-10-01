import type { ReactNode } from "react";
import { ProBadge } from "@/components/pro/ProBadge";
import { StreakIcon } from "@/components/streak/StreakIcon";
import { CoursesDoneIcon, XpIcon } from "@/components/ui/icons";
import { type Tier, TIER_NAMES } from "@/lib/leagues/tiers";
import { TierBadge } from "./TierBadge";

/** Your own card shows your totals; other learners' cards show only their public league fields. */
export type CardStats =
  | { kind: "own"; totalXp: number; streak: number; coursesCompleted: number }
  | { kind: "public"; weeklyXp: number };

/**
 * A learner's player card. No photos, ever: the avatar circle holds their tier badge. Pro
 * learners get the cosmetic frame (a cyan trace with nodes and one travelling light) and the Pro
 * badge; free learners' cards use the same layout with a clean outline.
 */
export function PlayerCard({ handle, tier, pro, stats, className = "" }: { handle: string; tier: Tier; pro: boolean; stats: CardStats; className?: string }) {
  return (
    <article
      aria-label={`Player card: ${handle}, ${TIER_NAMES[tier]} tier${pro ? ", Pro" : ""}`}
      className={`relative rounded-card border-2 bg-surface p-5 ${pro ? "border-transparent" : "border-line-strong"} ${className}`}
    >
      {pro && <ProFrame />}
      {pro && <ProBadge size="sm" className="absolute top-4 right-4" />}
      <div className="flex flex-col items-center text-center">
        <span className="grid size-24 place-items-center rounded-node border-2 border-accent-ink bg-screen">
          <TierBadge tier={tier} tile={false} className="size-16" />
        </span>
        <p className="mt-3 max-w-full truncate text-lead font-semibold">{handle}</p>
        <p className="mt-0.5 text-small text-ink-muted">{TIER_NAMES[tier]} tier</p>
      </div>
      <dl className="mt-4 space-y-2">
        {stats.kind === "own" ? (
          <>
            <Stat icon={<XpIcon className="size-5 text-accent-ink" />} label="Total XP" value={stats.totalXp.toLocaleString("en-AU")} />
            <Stat icon={<StreakIcon lit={stats.streak > 0} className="size-5 text-accent-ink" />} label="Day streak" value={String(stats.streak)} />
            <Stat icon={<CoursesDoneIcon className="size-5 text-accent-ink" />} label="Courses completed" value={String(stats.coursesCompleted)} />
          </>
        ) : (
          <>
            <Stat icon={<XpIcon className="size-5 text-accent-ink" />} label="XP this week" value={stats.weeklyXp.toLocaleString("en-AU")} />
            <Stat icon={<TierBadge tier={tier} className="size-5" />} label="Tier" value={TIER_NAMES[tier]} mono={false} />
          </>
        )}
      </dl>
    </article>
  );
}

function Stat({ icon, label, value, mono = true }: { icon: ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-control bg-surface-raised px-3 py-2.5">
      {icon}
      <dt className="flex-1 text-small text-ink-muted">{label}</dt>
      <dd className={`font-semibold text-ink ${mono ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}

/**
 * The Pro frame, drawn over the card's border: a cyan trace with a node at each corner and one
 * short light that travels round it (`animate-pro-trace`; still under reduced motion). The one
 * glow outside nodes and the primary button: a Brand exception for Pro cards only.
 */
function ProFrame() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible" preserveAspectRatio="none">
      <rect x="1" y="1" style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }} rx="12" fill="none" stroke="var(--color-accent)" strokeWidth="2" className="drop-shadow-pro" />
      <rect x="6" y="6" style={{ width: "calc(100% - 12px)", height: "calc(100% - 12px)" }} rx="8" fill="none" stroke="var(--color-accent-ink)" strokeWidth="1" opacity="0.6" />
      <rect
        x="1"
        y="1"
        style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
        rx="12"
        fill="none"
        stroke="var(--color-pro-light)"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="5 95"
        className="animate-pro-trace"
      />
      {[
        ["8", "8"],
        ["calc(100% - 8px)", "8"],
        ["8", "calc(100% - 8px)"],
        ["calc(100% - 8px)", "calc(100% - 8px)"],
      ].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} style={{ cx, cy }} r="3" fill="var(--color-accent)" />
      ))}
    </svg>
  );
}
