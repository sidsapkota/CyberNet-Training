"use client";

import { motion, PresenceContext, useReducedMotion } from "motion/react";
import { SHIELD_PATH } from "@/components/brand/geometry";

/** Which course's wrong-answer animation to play. */
export type WrongTheme = "devices" | "ai" | "internet" | "safety";

/** A course's theme, from its id (anything else gets the shield wobble). */
export function wrongThemeFor(courseId: string): WrongTheme {
  if (courseId === "inside-your-devices") return "devices";
  if (courseId === "how-ai-really-works") return "ai";
  if (courseId === "how-the-internet-works") return "internet";
  return "safety";
}

/** Longest any theme runs, in seconds (under 0.7s; tested). */
export const WRONG_BURST_SECONDS = 0.65;

/**
 * A wrong answer's little themed moment, beside the feedback heading: short, cartoony and never
 * scary. Inside Your Devices: a spark and a puff of smoke. How AI Really Works: a quick glitch.
 * How the Internet Works: a packet bouncing back. Stay Safe Online: a shield wobble. Decorative
 * only (hidden from screen readers), it never takes a tap, so "Try again" is always ready; under
 * reduced motion it isn't shown at all. Brand tokens only (no purple, no gradients).
 */
export function WrongBurst({ theme }: { theme: WrongTheme }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  const t = WRONG_BURST_SECONDS;
  // Plays even inside <AnimatePresence initial={false}> (the feedback footer), which would
  // otherwise skip first-mount animations.
  return (
    <PresenceContext.Provider value={null}>
    <motion.svg
      aria-hidden="true"
      data-wrong-burst={theme}
      viewBox="0 0 48 48"
      className="pointer-events-none size-12 shrink-0 overflow-visible"
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: t, times: [0, 0.8, 1] }}
    >
      {theme === "devices" && (
        <g>
          {/* A little chip, a zigzag spark, then a puff of smoke drifting up. */}
          <rect x="14" y="22" width="20" height="16" rx="3" className="fill-surface-raised stroke-line-strong" strokeWidth="2" />
          <motion.path
            d="M26 6 L20 16 L26 16 L21 26"
            fill="none"
            className="stroke-warning"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: t * 0.6, times: [0, 0.4, 1] }}
          />
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={20 + i * 5}
              cy="22"
              r="3.5"
              className="fill-ink-faint"
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.6, 0], y: -14 - i * 3, scale: [0.6, 1.2, 1.4] }}
              transition={{ duration: t, delay: 0.12 + i * 0.05, ease: "easeOut" }}
            />
          ))}
        </g>
      )}

      {theme === "ai" && (
        <g>
          {/* A tiny screen that glitches: its lines jump sideways for a moment, then settle. */}
          <rect x="8" y="10" width="32" height="24" rx="3" className="fill-surface-raised stroke-line-strong" strokeWidth="2" />
          {[16, 22, 28].map((y, i) => (
            <motion.rect
              key={y}
              x="13"
              y={y - 1.5}
              width="22"
              height="3"
              rx="1"
              className={i === 1 ? "fill-danger" : "fill-ink-faint"}
              initial={{ x: 0 }}
              animate={{ x: [0, i === 1 ? 5 : -4, i === 1 ? -3 : 3, 0] }}
              transition={{ duration: t * 0.55, delay: i * 0.03, times: [0, 0.3, 0.65, 1] }}
            />
          ))}
          <motion.rect
            x="8"
            y="10"
            width="32"
            height="24"
            rx="3"
            fill="none"
            className="stroke-danger"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0, 1, 0] }}
            transition={{ duration: t * 0.6 }}
          />
          <rect x="20" y="36" width="8" height="3" rx="1" className="fill-line-strong" />
        </g>
      )}

      {theme === "internet" && (
        <g>
          {/* A packet heads for a wall, bounces off and rolls back. */}
          <line x1="4" y1="32" x2="40" y2="32" className="stroke-line-strong" strokeWidth="2" strokeLinecap="round" />
          <rect x="40" y="14" width="4" height="22" rx="1.5" className="fill-danger" />
          <motion.circle
            cx="8"
            cy="26"
            r="5"
            className="fill-accent"
            initial={{ x: 0 }}
            animate={{ x: [0, 26, 14, 20, 12] }}
            transition={{ duration: t * 0.9, times: [0, 0.35, 0.6, 0.78, 1], ease: "easeOut" }}
          />
        </g>
      )}

      {theme === "safety" && (
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "50% 90%" }}
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, -12, 10, -6, 0] }}
          transition={{ duration: t * 0.85, ease: "easeInOut" }}
        >
          {/* The logo's shield, wobbling, with a little "bonk" flash. */}
          <g transform="translate(24 24) scale(0.62) translate(-32 -32)">
            <path d={SHIELD_PATH} className="fill-surface-raised stroke-line-strong" strokeWidth="3" strokeLinejoin="round" />
            <motion.path
              d={SHIELD_PATH}
              fill="none"
              className="stroke-danger"
              strokeWidth="3"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: t * 0.5 }}
            />
          </g>
        </motion.g>
      )}
    </motion.svg>
    </PresenceContext.Provider>
  );
}
