import Link from "next/link";
import type { ReactNode } from "react";
import { NetworkMark } from "@/components/network/NetworkMark";
import { NodeProgress, type ProgressNode } from "@/components/network/NodeProgress";
import { XIcon } from "@/components/ui/icons";
import { XpPill } from "@/components/XpPill";
import { ListenButton } from "./ListenButton";

/**
 * Full-height lesson layout: top bar (exit, the node progress trace, Listen, the lesson menu, XP),
 * card area, sticky footer. Back to the previous card and the hint live in the footer, beside the
 * main button, so the card itself gets the whole screen.
 */
export function PlayerShell({
  nodes,
  pulse,
  progressLabel,
  children,
  footer,
  exitHref = "/",
  onExit,
  onJump,
  viewing,
  menu,
  listen,
}: {
  /** What "Listen" reads for the card on screen (src/cards/speech.ts); no button without it. */
  listen?: string;
  /** Tap the trace to jump to an answered card (read-only) or back to the current one. */
  onJump?: (index: number) => void;
  /** The card being looked back at, if any. */
  viewing?: number | null;
  /** The lesson menu (the module's lessons), shown as a button in the header. */
  menu?: ReactNode;
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
        <div className="mx-auto flex max-w-lesson items-center gap-2 px-gutter py-3 sm:gap-3">
          <Link
            href={exitHref}
            aria-label="Exit to the course path"
            title="Exit to the course path"
            onClick={onExit}
            className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <XIcon className="size-5" />
          </Link>
          <NodeProgress nodes={nodes} pulse={pulse} label={progressLabel} onJump={onJump} viewing={viewing} />
          {listen && <ListenButton text={listen} />}
          {menu}
          {/* With the menu there, XP shows from 400px up (it's in each answer's feedback too). */}
          <span className={menu ? "hidden min-[400px]:contents" : "contents"}>
            <XpPill />
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lesson flex-1 px-gutter pt-5 pb-6 sm:pt-10 sm:pb-10">{children}</main>
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
