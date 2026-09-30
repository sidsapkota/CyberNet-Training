"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { quizNetworkLayout } from "@/lib/network/layout";

const RING_RADIUS = 46;
const Q_R = 9;
const HUB_R = 13;

/**
 * Quiz results as a network: one node per question around a hub (ring, up to 8 questions),
 * or a compact grid for longer quizzes. Correct = filled success node with a check; wrong =
 * outlined danger node with a cross, so results never rely on colour alone. The hub lights
 * (and a perimeter traces round) only when the quiz is passed.
 */
export function QuizNetwork({ results, passed }: { results: boolean[]; passed: boolean }) {
  const reduceMotion = useReducedMotion();
  const layout = quizNetworkLayout(results.length, RING_RADIUS);
  const correctCount = results.filter(Boolean).length;
  const label = `${correctCount} of ${results.length} questions correct${passed ? ", quiz passed" : ""}`;
  const appear = (i: number) =>
    reduceMotion
      ? {}
      : {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { delay: 0.1 + i * 0.07, type: "spring" as const, stiffness: 500, damping: 24 },
        };

  if (layout.mode === "grid") {
    return (
      <ol
        aria-label={label}
        className="mx-auto grid w-fit gap-2"
        style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}
      >
        {results.map((correct, i) => (
          <motion.li
            key={i}
            {...appear(i)}
            className={`grid size-9 place-items-center rounded-node border-2 ${
              correct ? "border-success bg-success text-on-success" : "border-danger bg-surface text-danger"
            }`}
          >
            {correct ? <CheckIcon className="size-4" strokeWidth={2.5} /> : <XIcon className="size-4" strokeWidth={2.5} />}
            <span className="sr-only">
              Question {i + 1}: {correct ? "correct" : "incorrect"}
            </span>
          </motion.li>
        ))}
      </ol>
    );
  }

  const extent = RING_RADIUS + Q_R + 6;
  return (
    <svg
      viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
      className="mx-auto size-48 overflow-visible"
      role="img"
      aria-label={label}
    >
      {passed && (
        <motion.circle
          r={RING_RADIUS + Q_R + 4}
          fill="none"
          stroke="var(--color-accent-ink)"
          strokeWidth={1.5}
          strokeLinecap="round"
          {...(reduceMotion
            ? {}
            : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay: 0.55, duration: 0.6 } })}
        />
      )}

      {layout.positions.map((p, i) => {
        const correct = results[i];
        const length = Math.hypot(p.x, p.y);
        const ux = p.x / length;
        const uy = p.y / length;
        return (
          <motion.line
            key={`l${i}`}
            x1={ux * HUB_R}
            y1={uy * HUB_R}
            x2={p.x - ux * Q_R}
            y2={p.y - uy * Q_R}
            stroke={correct ? "var(--color-accent-ink)" : "var(--color-line-strong)"}
            strokeWidth={2.5}
            strokeLinecap="round"
            {...(reduceMotion
              ? {}
              : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay: 0.1 + i * 0.07, duration: 0.25 } })}
          />
        );
      })}

      <motion.circle
        r={HUB_R}
        fill={passed ? "var(--color-accent)" : "var(--color-surface-raised)"}
        stroke={passed ? "var(--color-accent-ink)" : "var(--color-line-strong)"}
        strokeWidth={2}
        style={{ filter: passed ? "drop-shadow(0 0 6px rgb(0 194 255 / 0.55))" : undefined }}
        {...(reduceMotion
          ? {}
          : { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay: 0.5, type: "spring", stiffness: 400, damping: 20 } })}
      />

      {layout.positions.map((p, i) => {
        const correct = results[i];
        return (
          <motion.g key={`n${i}`} {...appear(i)} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
            <circle
              cx={p.x}
              cy={p.y}
              r={Q_R}
              fill={correct ? "var(--color-success)" : "var(--color-surface)"}
              stroke={correct ? "var(--color-success)" : "var(--color-danger)"}
              strokeWidth={2}
            />
            {correct ? (
              <CheckIcon x={p.x - 5.5} y={p.y - 5.5} width={11} height={11} strokeWidth={3} color="var(--color-on-success)" />
            ) : (
              <XIcon x={p.x - 5.5} y={p.y - 5.5} width={11} height={11} strokeWidth={3} color="var(--color-danger)" />
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
