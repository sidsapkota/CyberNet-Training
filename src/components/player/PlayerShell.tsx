import Link from "next/link";
import type { ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";
import { XpPill } from "@/components/XpPill";
import { ProgressBar } from "./ProgressBar";

/** Full-height lesson layout: top bar with progress, scrollable card area, sticky footer. */
export function PlayerShell({
  progress,
  progressLabel,
  children,
  footer,
}: {
  progress: number;
  progressLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-lesson items-center gap-3 px-gutter py-3 sm:py-4">
          <Link
            href="/"
            aria-label="Exit to courses"
            title="Exit to courses"
            className="grid size-10 shrink-0 place-items-center rounded-pill text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <XIcon className="size-6" />
          </Link>
          <ProgressBar value={progress} label={progressLabel} />
          <XpPill />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lesson flex-1 px-gutter pt-4 pb-10 sm:pt-10">
        {children}
      </main>
      {footer}
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <PlayerShell progress={0} progressLabel="Loading lesson">
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-8 w-3/4 rounded-lg bg-surface-muted" />
        <div className="h-4 w-full rounded bg-surface-muted" />
        <div className="h-4 w-5/6 rounded bg-surface-muted" />
        <div className="mt-8 h-14 w-full rounded-control bg-surface-muted" />
        <div className="h-14 w-full rounded-control bg-surface-muted" />
      </div>
      <span className="sr-only">Loading…</span>
    </PlayerShell>
  );
}
