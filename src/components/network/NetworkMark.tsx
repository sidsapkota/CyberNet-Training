"use client";

import { motion, useReducedMotion } from "motion/react";
import { connectorPath, HUB, MARK_STROKE, MARK_VIEWBOX, NODE_R, NODES, SHIELD_PATH } from "@/components/brand/geometry";

export type NetworkMarkMode =
  /** Hub appears, connectors draw out, nodes light, shield traces round (~1s). Completion screens. */
  | "assemble"
  /** Dim network with nodes lighting in sequence. Loading states. */
  | "loading"
  /** Everything dim. Locked and empty states. */
  | "dim"
  /** Fully lit, static. */
  | "lit";

const LIT_STROKE = "var(--color-accent-ink)";
const LIT_FILL = "var(--color-accent)";
const DIM = "var(--color-line-strong)";

/**
 * The logo's network as a living illustration. Lit strokes use `accent-ink` (contrast-safe
 * on light surfaces); lit fills use `accent`. Under reduced motion every mode renders its
 * final state instantly.
 */
export function NetworkMark({
  mode,
  shield = true,
  className = "",
  label,
}: {
  mode: NetworkMarkMode;
  shield?: boolean;
  className?: string;
  label?: string;
}) {
  const reduceMotion = useReducedMotion();
  const animate = mode === "assemble" && !reduceMotion;
  const lit = mode === "assemble" || mode === "lit";
  const stroke = lit ? LIT_STROKE : DIM;
  const fill = lit ? LIT_FILL : "var(--color-surface-raised)";

  const draw = (delay: number, duration = 0.3) =>
    animate
      ? {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { delay, duration, ease: [0.22, 1, 0.36, 1] as const },
        }
      : {};

  const pop = (delay: number) =>
    animate
      ? {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { delay, type: "spring" as const, stiffness: 520, damping: 22 },
        }
      : {};

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={`overflow-visible ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {shield && (
        <motion.path
          d={SHIELD_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth={MARK_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...draw(0.45, 0.55)}
        />
      )}
      {NODES.map((node, i) => (
        <motion.path
          key={`c${i}`}
          d={connectorPath(node)}
          stroke={stroke}
          strokeWidth={MARK_STROKE}
          strokeLinecap="round"
          {...draw(0.12 + i * 0.05, 0.22)}
        />
      ))}
      <motion.circle
        cx={HUB.x}
        cy={HUB.y}
        r={HUB.r}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        style={{
          transformOrigin: `${HUB.x}px ${HUB.y}px`,
          filter: lit ? "drop-shadow(0 0 4px rgb(0 194 255 / 0.55))" : undefined,
        }}
        {...pop(0)}
      />
      {NODES.map((node, i) => (
        <motion.circle
          key={`n${i}`}
          cx={node.x}
          cy={node.y}
          r={NODE_R}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          className={mode === "loading" ? "animate-node-seq" : undefined}
          // Sequential lighting for the loading state.
          {...(mode === "loading"
            ? { style: { animationDelay: `${i * 0.4}s`, fill: LIT_FILL, stroke: LIT_STROKE } }
            : pop(0.3 + i * 0.06))}
        />
      ))}
    </svg>
  );
}
