"use client";

import { motion, PresenceContext, useReducedMotion } from "motion/react";
import { type ReactNode, useContext, useEffect, useId, useState } from "react";
import { PRESS_SPRING } from "@/lib/motion";
import { HEAD_SHIELD_PATH, type MascotPalette, MASCOT_TOKENS, MASCOT_VIEWBOX, SHOULDERS } from "./geometry";
import { Eyes, GlowFilter, MascotFigure, type MascotSlots } from "./parts";
import { MASCOT_LABELS, MASCOT_POSES, type MascotExpression, type MascotPose } from "./poses";
import { type MascotReaction, NECK, REACTION_MS, REACTION_SIZE, SCAN, SCAN_CHECK, scanTimes } from "./reactions";

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
 * - `reaction` plays once when it mounts (give it a new `key` to replay): a bob as it appears, a hop
 *   (right answer), a head tilt (wrong answer), or the "security scan" (./reactions.ts). They animate
 *   parts of the SVG, run under 600 ms (the scan under 1.2 s) and never block anything.
 * - Decorative by default (hidden from screen readers); pass `label` when it carries meaning.
 * - Under prefers-reduced-motion everything is static (the scan shows only its end state, the check).
 */
export function Mascot({
  expression,
  size = 160,
  idle = false,
  label,
  reaction,
  className = "",
}: {
  expression: MascotExpression;
  /** A one-shot reaction, played on mount. */
  reaction?: MascotReaction;
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
  const play = reaction && !reduceMotion ? reaction : null;
  const presence = useContext(PresenceContext);
  const clip = `${glow}-shield`;

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
        transition={{ duration: REACTION_MS.wave / 1000, delay: 0.1, ease: "easeInOut" }}
      >
        {children}
      </motion.g>
    ),
    head: (children: ReactNode) => (
      <motion.g
        data-part="head"
        style={{ transformBox: "view-box", transformOrigin: `${NECK.x}px ${NECK.y}px` }}
        animate={play === "tilt" ? { rotate: [0, -REACTION_SIZE.tiltDeg, 0] } : undefined}
        transition={{ duration: REACTION_MS.tilt / 1000, ease: "easeInOut" }}
      >
        {children}
      </motion.g>
    ),
    headOverlay: (p: MascotPose) =>
      reaction === "scan" ? <ScanOverlay pose={p} palette={MASCOT_TOKENS} glow={glow} clip={clip} animated={!reduceMotion} /> : null,
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
      {/* A reaction must play when the mascot appears, even inside <AnimatePresence initial={false}>
          (the feedback footer), which would otherwise skip every first-mount animation below it. */}
      <PresenceContext.Provider value={reaction ? null : presence}>
        <motion.g
          key={expression}
          style={{ transformBox: "view-box", transformOrigin: "100px 222px" }}
          // MotionConfig reducedMotion="user" makes this transform instant under reduced motion.
          // A reaction replaces this entrance (one movement at a time, never two bounces).
          initial={reaction ? false : { y: -8, scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          transition={PRESS_SPRING}
        >
          <motion.g
            data-part="figure"
            // The tilt comes with the appearance bob (one gentle movement of the body, the head turning).
            animate={play === "hop" ? { y: [0, -REACTION_SIZE.hop, 0] } : play === "bob" || play === "tilt" ? { y: [0, -REACTION_SIZE.bob, 0] } : undefined}
            transition={
              play === "hop"
                ? { duration: REACTION_MS.hop / 1000, times: [0, 0.42, 1], ease: ["easeOut", "easeIn"] }
                : { duration: REACTION_MS.bob / 1000, ease: "easeInOut" }
            }
          >
            <MascotFigure pose={pose} palette={MASCOT_TOKENS} glow={glow} slots={slots} />
          </motion.g>
        </motion.g>
      </PresenceContext.Provider>
    </svg>
  );
}

/**
 * The signature "security scan", drawn over the face in the head's 64-unit coordinates: the shield's
 * outline glows cyan, a scan line sweeps top to bottom (clipped to the shield), the eyes light up,
 * then a check pops on the shield's corner with a tiny spring. The check stays; the rest fades.
 * Not animated (reduced motion): the check alone.
 */
function ScanOverlay({
  pose,
  palette,
  glow,
  clip,
  animated,
}: {
  pose: MascotPose;
  palette: MascotPalette;
  glow: string;
  clip: string;
  animated: boolean;
}) {
  const total = SCAN.total / 1000;
  const [glowIn0, glowIn1] = scanTimes(...SCAN.glowIn);
  const [out0, out1] = scanTimes(...SCAN.glowOut);
  const [sweep0, sweep1] = scanTimes(...SCAN.sweep);
  const [eyes0, eyes1] = scanTimes(...SCAN.eyes);
  const [check0, check1] = scanTimes(...SCAN.check);
  const { x, y, r } = SCAN_CHECK;
  const check = (
    <g>
      <circle cx={x} cy={y} r={r} fill={palette.line} stroke={palette.body} strokeWidth={1.1} />
      <path
        d={`M${x - 2.5} ${y + 0.2}L${x - 0.6} ${y + 2.1}L${x + 2.7} ${y - 1.8}`}
        fill="none"
        stroke={palette.pupil}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
  if (!animated) return <g data-scan="still">{check}</g>;
  return (
    <g data-scan="playing" pointerEvents="none">
      <defs>
        <clipPath id={clip}>
          <path d={HEAD_SHIELD_PATH} />
        </clipPath>
      </defs>
      {/* 1. The shield's outline glows. */}
      <motion.path
        data-part="scan-glow"
        d={HEAD_SHIELD_PATH}
        fill="none"
        stroke={palette.line}
        strokeWidth={3}
        strokeLinejoin="round"
        filter={`url(#${glow})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: total, times: [glowIn0, glowIn1, out0, out1], ease: "easeOut" }}
      />
      {/* 2. A scan line sweeps the head, top to bottom (a solid line and a faint band: no gradients). */}
      <g clipPath={`url(#${clip})`}>
        <motion.g
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, 0, 50, 50], opacity: [0, 1, 1, 0] }}
          transition={{ duration: total, times: [0, sweep0, sweep1, Math.min(1, sweep1 + 0.04)], ease: "linear" }}
        >
          <rect x={8} y={-1.5} width={48} height={6} fill={palette.line} opacity={0.16} />
          <rect x={8} y={4.5} width={48} height={1.6} fill={palette.line} />
        </motion.g>
      </g>
      {/* 3. The eyes light up. */}
      <motion.g
        filter={`url(#${glow})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 0] }}
        transition={{ duration: total, times: [0, eyes0, (eyes0 + eyes1) / 2, eyes1] }}
      >
        <Eyes pose={pose} palette={palette} glow={glow} />
      </motion.g>
      {/* 4. The check pops, with a tiny spring, and stays. */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        data-part="scan-check"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 1.18, 1], opacity: [0, 0, 1, 1] }}
        transition={{ duration: total, times: [0, check0, (check0 + check1) / 2 + 0.04, check1] }}
      >
        {check}
      </motion.g>
    </g>
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
