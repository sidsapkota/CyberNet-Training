"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * A circular progress ring (cyan = progress). It draws up to its value on mount and animates
 * whenever the value changes. Under reduced motion it renders the final value.
 */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  children,
  delay = 0.2,
}: {
  /** 0 to 1. */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      role="img"
      aria-label={label}
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        {clamped > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: clamped }}
            transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
