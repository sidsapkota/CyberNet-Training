"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { BringItIcon, ComboIcon, WowIcon } from "@/components/ui/icons";
import { EMOTES, type EmoteId } from "@/lib/challenges/rules";
import { PRESS_SPRING } from "@/lib/motion";

const ICONS: Partial<Record<EmoteId, typeof WowIcon>> = { "on-fire": ComboIcon, wow: WowIcon, "bring-it": BringItIcon };

/** One emote, as the challenger sees it (animated ones pop in once; still under reduced motion). */
export function EmoteChip({ id }: { id: string }) {
  const e = EMOTES.find((x) => x.id === id);
  const reduce = useReducedMotion();
  if (!e) return null;
  const Icon = ICONS[e.id];
  return (
    <motion.span
      initial={e.pro && !reduce ? { scale: 0.6, rotate: -8 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={PRESS_SPRING}
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-caption font-semibold ${e.pro ? "border-accent-ink text-accent-ink" : "border-line text-ink"}`}
    >
      {Icon && <Icon className="size-3.5" />}
      {e.label}
    </motion.span>
  );
}

/**
 * The player's one emote after a challenge: preset buttons only (no free text anywhere). The
 * animated ones are for Pro. Sent once; the challenger sees it on their challenge page.
 */
export function Emotes({ challengeId, attemptId, attemptKey, pro, className = "" }: { challengeId: string; attemptId: number; attemptKey: string; pro: boolean; className?: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reduce = useReducedMotion();

  async function send(id: string) {
    setPending(true);
    const response = await fetch(`/api/challenges/${challengeId}/emote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, key: attemptKey, emote: id }) }).catch(() => null);
    setPending(false);
    if (response?.ok) setSent(id);
  }

  if (sent) {
    return (
      <p role="status" className={`flex items-center justify-center gap-2 text-small text-ink-muted ${className}`}>
        Sent <EmoteChip id={sent} />
      </p>
    );
  }
  return (
    <div className={className}>
      <p className="text-small text-ink-muted">Send a reaction</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {EMOTES.filter((e) => !e.pro || pro).map((e) => {
          const Icon = ICONS[e.id];
          return (
            <motion.button
              key={e.id}
              type="button"
              disabled={pending}
              onClick={() => void send(e.id)}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              transition={PRESS_SPRING}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3.5 text-small font-semibold ${e.pro ? "border-accent-ink text-accent-ink" : "border-line-strong text-ink"} hover:bg-surface-raised disabled:opacity-60`}
            >
              {Icon && <Icon className="size-4" />}
              {e.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
