import Link from "next/link";
import type { ReactNode } from "react";
import { NetworkMark } from "@/components/network/NetworkMark";
import { NodeProgress, type ProgressNode } from "@/components/network/NodeProgress";
import { BackIcon, XIcon } from "@/components/ui/icons";
import { XpPill } from "@/components/XpPill";

/** Full-height lesson layout: top bar with the node progress trace, card area, sticky footer. */
export function PlayerShell({
  nodes,
  pulse,
  progressLabel,
  children,
  footer,
  exitHref = "/",
  onBack,
  onExit,
}: {
  /** Back to the previous card (lessons and quizzes); no button without it. */
  onBack?: () => void;
  /** Called as the learner leaves with ✕ (e.g. to note where they stopped). */
  onExit?: () => void;
  /** Where ✕ goes: the lesson's course path. */
  exitHref?: string;
  nodes: ProgressNode[];
  pulse?: { key: number; from: number; to: number } | null;
  progressLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-lesson items-center gap-3 px-gutter py-3">
          <Link
            href={exitHref}
            aria-label="Exit to the course path"
            title="Exit to the course path"
            onClick={onExit}
            className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <XIcon className="size-5" />
          </Link>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to the previous card"
              title="Back (Alt + Left arrow)"
              className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <BackIcon className="size-5" />
            </button>
          )}
          <NodeProgress nodes={nodes} pulse={pulse} label={progressLabel} />
          <XpPill />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lesson flex-1 px-gutter pt-6 pb-10 sm:pt-10">{children}</main>
      {footer}
    </div>
  );
}

/** n progress nodes all in one state; for gates, loading and result screens. */
export function uniformNodes(count: number, state: ProgressNode["state"]): ProgressNode[] {
  return Array.from({ length: Math.max(1, count) }, () => ({ state }));
}

export function PlayerSkeleton() {
  return (
    <PlayerShell nodes={uniformNodes(8, "upcoming")} progressLabel="Loading lesson">
      <div className="flex min-h-[55dvh] flex-col items-center justify-center gap-4 text-center">
        <NetworkMark mode="loading" className="size-20" />
        <p className="font-mono text-caption tracking-wider text-ink-faint uppercase">Connecting…</p>
      </div>
    </PlayerShell>
  );
}
