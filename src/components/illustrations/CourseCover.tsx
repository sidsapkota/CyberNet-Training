"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ComponentType } from "react";
import { NetworkMark } from "@/components/network/NetworkMark";

/*
 * Course covers: geometric network illustrations drawn for the always-navy `screen` panel.
 * Every line is horizontal, vertical or 45°, like the logo and the circuit traces. The only
 * motion is a packet travelling along the lit route (a static frame under reduced motion).
 */

const VIEW_W = 320;
const VIEW_H = 180;

type Point = readonly [number, number];

/** Timeline positions (0 to 1) for keyframes along a polyline, proportional to distance. */
function keyTimes(route: readonly Point[]): number[] {
  const lengths = route.slice(1).map(([x, y], i) => {
    const [px, py] = route[i] as Point;
    return Math.hypot(x - px, y - py);
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  let run = 0;
  return [0, ...lengths.map((l) => (run += l) / total)];
}

function Packet({ route, duration }: { route: readonly Point[]; duration: number }) {
  const reduceMotion = useReducedMotion();
  const middle = route[Math.floor(route.length / 2)] as Point;
  if (reduceMotion) {
    return <circle cx={middle[0]} cy={middle[1]} r={4.5} fill="var(--color-screen-accent)" />;
  }
  return (
    <motion.circle
      r={4.5}
      fill="var(--color-screen-accent)"
      initial={{ cx: route[0]?.[0], cy: route[0]?.[1], opacity: 0 }}
      animate={{
        cx: route.map((p) => p[0]),
        cy: route.map((p) => p[1]),
        opacity: route.map((_, i) => (i === 0 || i === route.length - 1 ? 0 : 1)),
      }}
      transition={{ duration, ease: "linear", times: keyTimes(route), repeat: Infinity, repeatDelay: 1.2 }}
    />
  );
}

function DotGrid() {
  const dots = [];
  for (let x = 16; x < VIEW_W; x += 24) {
    for (let y = 18; y < VIEW_H; y += 24) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1} />);
  }
  return <g fill="var(--color-screen-line)">{dots}</g>;
}

/* ── How the Internet Works: an octagonal globe of circuit traces, laptop to server ──────── */

const CX = 160;
const CY = 90;
const R = 62;
/** Half an octagon side for circumradius-ish R with 45° corners: R · tan(22.5°). */
const H = 25.7;

const GLOBE: Point[] = [
  [CX - H, CY - R],
  [CX + H, CY - R],
  [CX + R, CY - H],
  [CX + R, CY + H],
  [CX + H, CY + R],
  [CX - H, CY + R],
  [CX - R, CY + H],
  [CX - R, CY - H],
];

const ROUTE: Point[] = [
  [40, 142],
  [58, 142],
  [86, 114],
  [CX - 30, 114],
  [CX - 30, 66],
  [CX + 30, 66],
  [CX + R, 66],
  [240, 66],
  [256, 50],
  [282, 50],
];

const poly = (points: readonly Point[]) => points.map((p) => p.join(",")).join(" ");

function InternetCover() {
  const lines = "var(--color-on-screen-muted)";
  const lit = "var(--color-screen-accent)";
  const junctions: Point[] = [
    [CX - 30, 66],
    [CX + 30, 66],
    [CX - 30, 114],
    [CX + 30, 114],
    [CX, 90],
    [CX, CY - R],
    [CX, CY + R],
    [CX - R, 90],
    [CX + R, 90],
  ];

  return (
    <>
      <DotGrid />
      {/* Globe outline, latitudes and meridians */}
      <g fill="none" stroke={lines} strokeWidth={1.5} strokeLinejoin="round" opacity={0.7}>
        <polygon points={poly(GLOBE)} />
        <path d={`M${CX - R} ${CY - 24}H${CX + R}M${CX - R} ${CY}H${CX + R}M${CX - R} ${CY + 24}H${CX + R}`} />
        <path d={`M${CX} ${CY - R}V${CY + R}M${CX - 30} ${CY - 57.7}V${CY + 57.7}M${CX + 30} ${CY - 57.7}V${CY + 57.7}`} />
      </g>
      {/* The lit route */}
      <polyline points={poly(ROUTE)} fill="none" stroke={lit} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Junction nodes */}
      {junctions.map(([x, y]) => {
        const onRoute = ROUTE.some(([rx, ry]) => rx === x && ry === y);
        return (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={onRoute ? 5 : 4}
            fill={onRoute ? lit : "var(--color-screen)"}
            stroke={onRoute ? lit : lines}
            strokeWidth={1.5}
          />
        );
      })}
      {/* Laptop */}
      <g transform="translate(40 142)">
        <circle r={15} fill="var(--color-screen)" stroke={lit} strokeWidth={2} />
        <rect x={-7} y={-5} width={14} height={9} rx={1.5} fill="none" stroke="var(--color-on-screen)" strokeWidth={1.5} />
        <path d="M-9 6H9" stroke="var(--color-on-screen)" strokeWidth={1.5} strokeLinecap="round" />
      </g>
      {/* Server */}
      <g transform="translate(282 50)">
        <circle r={15} fill="var(--color-screen)" stroke={lit} strokeWidth={2} />
        <path
          d="M-6 -6H6V-1H-6ZM-6 1H6V6H-6Z"
          fill="none"
          stroke="var(--color-on-screen)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </g>
      <Packet route={ROUTE} duration={4.2} />
    </>
  );
}

/* ── Registry ─────────────────────────────────────────────────────────────────────────── */

const COVERS: Record<string, ComponentType> = {
  "how-the-internet-works": InternetCover,
};

/** Cover for a course. Courses without a custom cover get the logo network on the grid. */
export function CourseCover({
  courseId,
  title,
  className = "",
}: {
  courseId: string;
  title: string;
  className?: string;
}) {
  const Cover = COVERS[courseId];
  return (
    <div className={`relative overflow-hidden bg-screen ${className}`}>
      {Cover ? (
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={`${title}: illustration`}
          className="absolute inset-0 size-full"
        >
          <Cover />
        </svg>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <NetworkMark mode="lit" className="size-20" label={`${title}: illustration`} />
        </div>
      )}
    </div>
  );
}
