"use client";

import { MascotAvatar } from "@/components/mascot/outfit/MascotAvatar";
import { effectiveOutfit } from "@/lib/rewards/rules";

/**
 * The learner's avatar in a node: the mascot's head and shoulders in their outfit (avatars v2;
 * never a photo), on the navy screen tile. Pro items show only while `pro` is true. Pro members'
 * node wears the Pro frame, as before.
 */
export function Avatar({
  outfit,
  pro = false,
  frame = pro,
  size,
  label,
  className = "",
}: {
  outfit: readonly string[] | null | undefined;
  /** The learner has Pro: Pro items may show. */
  pro?: boolean;
  /** Draw the Pro frame (defaults to `pro`; small rows that already show the Pro gem turn it off). */
  frame?: boolean;
  /** Diameter in px. */
  size: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-pro={frame || undefined}
      style={{ width: size, height: size }}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-node border-2 border-accent-ink bg-screen ${
        frame ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas drop-shadow-pro" : ""
      } ${className}`}
    >
      <MascotAvatar outfit={effectiveOutfit(outfit, pro)} framing="bust" size={size - 4} />
    </span>
  );
}
