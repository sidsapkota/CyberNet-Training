"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId } from "react";
import { PRESS_SPRING } from "@/lib/motion";
import { type MascotPalette, MASCOT_TOKENS, SHOULDERS } from "../geometry";
import { GlowFilter, MascotFigure, type MascotSlots } from "../parts";
import { MASCOT_POSES } from "../poses";
import { REACTION_MS } from "../reactions";
import { ACCESSORY_TOKENS, type AccessoryStyle, accessoryLayers, drawAccessory, type Layer } from "./accessories";

/** Head and shoulders, for small circles (header, leaderboard rows): the same drawing, cropped. */
const VIEWBOX = { full: "0 0 200 232", bust: "20 6 164 164" } as const;

/** A flat, dim shape for locked items: every part in one muted colour. */
const SILHOUETTE = "var(--color-line-strong)";
const SILHOUETTE_PALETTE: MascotPalette = { body: SILHOUETTE, line: SILHOUETTE, pupil: SILHOUETTE, shine: SILHOUETTE, alert: SILHOUETTE };

/**
 * The learner's avatar: the mascot (waving, as on the art sheet) wearing their outfit (avatars v2).
 * The outfit is already checked (`effectiveOutfit`). Decorative unless `label` is given.
 * - `pop`: the item just put on pops in with a small spring (≤ 7% overshoot).
 * - `wave`: change it to play the short wave (560 ms) again.
 * Nothing moves under reduced motion. `size` (px) drops fine detail below 40px.
 */
export function MascotAvatar({
  outfit,
  framing = "full",
  size,
  pop,
  wave = 0,
  silhouette = false,
  label,
  className = "",
}: {
  outfit: readonly string[];
  framing?: "full" | "bust";
  /** Height in px. */
  size: number;
  pop?: string | null;
  wave?: number;
  silhouette?: boolean;
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const glow = `avatar-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const style: AccessoryStyle = silhouette
    ? { line: SILHOUETTE, fill: SILHOUETTE, body: SILHOUETTE, glow, small: size < 40 }
    : { ...ACCESSORY_TOKENS, glow, small: size < 40 };

  const layer = (which: Layer): ReactNode =>
    outfit
      .filter((id) => accessoryLayers(id).includes(which))
      .map((id) => (
        <motion.g
          key={id}
          data-item={id}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={pop === id && !reduce ? { scale: 0.6, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={PRESS_SPRING}
        >
          {drawAccessory(id, which, style)}
        </motion.g>
      ));

  const slots: MascotSlots = {
    arm: (index, children) =>
      index === 0 ? (
        <motion.g
          key={wave}
          style={{ transformBox: "view-box", transformOrigin: `${SHOULDERS[0].x}px ${SHOULDERS[0].y}px` }}
          animate={wave > 0 && !reduce ? { rotate: [0, 9, -3, 9, 0] } : undefined}
          transition={{ duration: REACTION_MS.wave / 1000, ease: "easeInOut" }}
        >
          {children}
        </motion.g>
      ) : (
        children
      ),
    outfit: { behind: layer("behind"), torso: layer("torso"), neck: layer("neck"), head: layer("head") },
  };

  const [, , w, h] = VIEWBOX[framing].split(" ").map(Number) as [number, number, number, number];
  return (
    <svg
      viewBox={VIEWBOX[framing]}
      height={size}
      width={Math.round((size * w) / h)}
      className={`shrink-0 ${framing === "full" ? "overflow-visible" : ""} ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <defs>
        <GlowFilter id={glow} />
      </defs>
      <MascotFigure pose={MASCOT_POSES.happy} palette={silhouette ? SILHOUETTE_PALETTE : MASCOT_TOKENS} glow={glow} slots={slots} />
    </svg>
  );
}
