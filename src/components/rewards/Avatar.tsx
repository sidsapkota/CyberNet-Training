"use client";

import { motion, useReducedMotion } from "motion/react";
import { HUB, NODES, SHIELD_PATH } from "@/components/brand/geometry";
import { BadgeGlyph } from "@/components/ui/icons";
import { itemById, type Accessory, type Tone } from "@/lib/rewards/items";
import { effectiveAvatar } from "@/lib/rewards/rules";

const TONES: Record<Tone, string> = {
  navy: "bg-screen text-on-screen",
  cyan: "bg-accent-soft text-accent-ink",
  mint: "bg-success-soft text-success",
  amber: "bg-warning-soft text-warning",
  coral: "bg-danger-soft text-danger",
  raised: "bg-surface-raised text-ink",
};

/** The mascot's head: the logo shield with the logo's top nodes as eyes (fixed mascot colours). */
function MascotHead({ accessory }: { accessory: Accessory }) {
  const [l, r] = NODES;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="size-[78%]">
      <path d={SHIELD_PATH} fill="var(--color-mascot-body)" stroke="var(--color-mascot-line)" strokeWidth={3} strokeLinejoin="round" />
      {[l, r].map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y + 2} r={5.5} fill="var(--color-mascot-line)" />
          <circle cx={n.x + 0.8} cy={n.y + 2.6} r={2.4} fill="var(--color-mascot-pupil)" />
        </g>
      ))}
      <path d={`M${HUB.x - 6} ${HUB.y + 9}q6 5 12 0`} stroke="var(--color-mascot-line)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {accessory === "cap" && (
        <g fill="var(--color-mascot-line)">
          <path d="M14 15q18-14 36 0v3H14z" />
          <path d="M46 15h13v3H46z" />
        </g>
      )}
      {accessory === "headphones" && (
        <g fill="var(--color-on-screen)" stroke="var(--color-on-screen)">
          <path d="M10 30a22 22 0 0 1 44 0" strokeWidth={4} fill="none" />
          <rect x={4} y={27} width={10} height={15} rx={4} />
          <rect x={50} y={27} width={10} height={15} rx={4} />
        </g>
      )}
      {accessory === "glasses" && (
        <g stroke="var(--color-on-screen)" strokeWidth={2.5} fill="none">
          <circle cx={l.x} cy={l.y + 2} r={8} />
          <circle cx={r.x} cy={r.y + 2} r={8} />
          <path d={`M${l.x + 8} ${l.y + 2}h${r.x - l.x - 16}`} />
        </g>
      )}
      {accessory === "scarf" && <path d="M16 46q16 10 32 0l2 6q-18 10-36 0z" fill="var(--color-danger)" />}
      {accessory === "crown" && <path d="M18 14l6 5 8-9 8 9 6-5v6H18z" fill="var(--color-accent)" />}
    </svg>
  );
}

/**
 * The learner's avatar in a node: an item from the fixed list (never a photo). Pro members' node
 * wears the Pro frame, as before. The trace frame (a Pro item) runs its light round twice, then
 * stays still; nothing moves under reduced motion.
 */
export function Avatar({
  avatar,
  pro = false,
  frame = pro,
  className = "size-9",
  label,
}: {
  avatar: string | null | undefined;
  /** The learner has Pro: Pro items may show. */
  pro?: boolean;
  /** Draw the Pro frame (defaults to `pro`; small rows that already show the Pro gem turn it off). */
  frame?: boolean;
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const item = itemById(effectiveAvatar(avatar, pro))!;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-pro={frame || undefined}
      className={`relative grid shrink-0 place-items-center overflow-visible rounded-node border-2 border-accent-ink ${TONES[item.tone]} ${
        frame ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas drop-shadow-pro" : ""
      } ${className}`}
    >
      {item.look.kind === "mascot" ? <MascotHead accessory={item.look.accessory} /> : <BadgeGlyph icon={item.look.icon} className="size-[55%]" />}
      {item.animated && !reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute -inset-1 rounded-node border-2 border-accent"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0, 1, 0], scale: [0.9, 1.08, 1.12] }}
          transition={{ duration: 1.1, repeat: 1, ease: "easeOut" }}
        />
      )}
    </span>
  );
}
