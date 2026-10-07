"use client";

import { motion } from "motion/react";
import { Avatar } from "@/components/rewards/Avatar";

export interface Duelist {
  name: string;
  outfit: readonly string[] | null;
  pro?: boolean;
}

/**
 * The duel's two health bars: you on the left, your rival on the right. One segment per question; a
 * wrong answer empties one (a short shrink; none under reduced motion). Always shown as a number too
 * ("4/5"), never by colour alone.
 */
export function HealthBars({ me, rival, mine, theirs, total }: { me: Duelist; rival: Duelist | null; mine: number; theirs: number; total: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3" aria-label="Health">
      <Side duelist={me} left={mine} total={total} />
      {rival && <Side duelist={rival} left={theirs} total={total} end />}
    </div>
  );
}

function Side({ duelist, left, total, end = false }: { duelist: Duelist; left: number; total: number; end?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${end ? "flex-row-reverse text-right" : ""}`}>
      <Avatar outfit={duelist.outfit} pro={duelist.pro} size={32} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-1 text-caption font-semibold [overflow-wrap:anywhere]">
          <span className={end ? "order-2" : ""}>{duelist.name}</span>
          <span className="shrink-0 font-mono text-ink-muted tabular-nums" aria-label={`${left} of ${total} health`}>
            {left}/{total}
          </span>
        </p>
        <div className={`mt-1 flex gap-0.5 ${end ? "flex-row-reverse" : ""}`} aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className="h-2 flex-1 overflow-hidden rounded-sm bg-line">
              <motion.span
                className="block h-full bg-accent"
                initial={false}
                animate={{ scaleX: i < left ? 1 : 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: end ? 1 : 0 }}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
