"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { PRESS_SPRING } from "@/lib/motion";
import { MASCOT_TOKENS, MASCOT_VIEWBOX, SHOULDERS } from "./geometry";
import { GlowFilter, MascotFigure, type MascotSlots } from "./parts";
import { MASCOT_LABELS, MASCOT_POSES, type MascotExpression } from "./poses";

const PULSE: Record<string, { opacity: number[]; duration: number }> = {
  steady: { opacity: [1, 0.55, 1], duration: 2.4 },
  dim: { opacity: [0.45, 0.2, 0.45], duration: 3 },
  bright: { opacity: [1, 0.7, 1], duration: 1.2 },
  flicker: { opacity: [1, 0.3, 1, 0.6, 1], duration: 1.6 },
  alert: { opacity: [1, 0.35, 1], duration: 0.9 },
};

/**
 * The CyberNet mascot (name TBD): the logo shield as a face on a small robot body. See CLAUDE.md →
 * Brand → Mascot for where it may appear.
 *
 * - `expression` picks a pose; changing it plays a small spring bounce.
 * - `idle` adds an occasional blink and the antenna's mood pulse (and a short wave when happy).
 * - Decorative by default (hidden from screen readers); pass `label` when it carries meaning.
 * - Under prefers-reduced-motion everything is static.
 */
export function Mascot({
  expression,
  size = 160,
  idle = false,
  label,
  className = "",
}: {
  expression: MascotExpression;
  /** Height in px; width follows the character's proportions. */
  size?: number;
  idle?: boolean;
  label?: string | true;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const animate = idle && !reduceMotion;
  const pose = MASCOT_POSES[expression];
  const glow = `mascot-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const blinking = useBlink(animate && pose.eyes !== "happy");

  const slots: MascotSlots = {
    eyes: (children: ReactNode) => (
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ scaleY: blinking ? 0.1 : 1 }}
        transition={{ duration: 0.07 }}
      >
        {children}
      </motion.g>
    ),
    // Wrappers are always rendered (only what they animate changes), so server and client
    // markup match whatever the viewer's reduced-motion setting is.
    antennaLight: (children: ReactNode) => (
      <motion.g
        animate={animate ? { opacity: PULSE[pose.antenna]!.opacity } : undefined}
        transition={{ duration: PULSE[pose.antenna]!.duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.g>
    ),
    arm: (index, children) => (
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: `${SHOULDERS[index].x}px ${SHOULDERS[index].y}px` }}
        animate={animate && expression === "happy" && index === 0 ? { rotate: [0, 9, -3, 9, 0] } : undefined}
        transition={{ duration: 1.3, delay: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.g>
    ),
  };

  const labelText = label === true ? MASCOT_LABELS[expression] : label;
  return (
    <svg
      viewBox={`0 0 ${MASCOT_VIEWBOX.width} ${MASCOT_VIEWBOX.height}`}
      height={size}
      width={Math.round((size * MASCOT_VIEWBOX.width) / MASCOT_VIEWBOX.height)}
      className={`shrink-0 overflow-visible ${className}`}
      {...(labelText ? { role: "img", "aria-label": labelText } : { "aria-hidden": true })}
    >
      <defs>
        <GlowFilter id={glow} />
      </defs>
      <motion.g
        key={expression}
        style={{ transformBox: "view-box", transformOrigin: "100px 222px" }}
        // MotionConfig reducedMotion="user" makes this transform instant under reduced motion.
        initial={{ y: -8, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={PRESS_SPRING}
      >
        <MascotFigure pose={pose} palette={MASCOT_TOKENS} glow={glow} slots={slots} />
      </motion.g>
    </svg>
  );
}

/** Blinks every few seconds while `enabled`. Random timing only runs in effects, never in render. */
function useBlink(enabled: boolean): boolean {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setBlinking(true);
          timer = window.setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 140);
        },
        2600 + Math.random() * 3200,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return enabled && blinking;
}
