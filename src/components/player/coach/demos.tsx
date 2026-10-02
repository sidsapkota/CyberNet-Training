"use client";

import { motion, type TargetAndTransition, type Transition, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { CoachKey } from "@/lib/coach";

/*
 * Tiny animated demos for the "how to play" panels. Each plays once (~2.6s; the brand allows no
 * extra loops) and can be replayed. A cyan dot is the learner's finger (cyan = interactive).
 * Under reduced motion every element renders its final frame. Drawn with theme tokens so they
 * work in both themes. Geometry only: no words inside the demos, the panel text explains.
 */

const D = 2.6;
const C = {
  box: "var(--color-surface-raised)",
  edge: "var(--color-line-strong)",
  ink: "var(--color-ink-muted)",
  faint: "var(--color-line)",
  accent: "var(--color-accent)",
  ring: "var(--color-accent-ink)",
  ok: "var(--color-success)",
};

type Frames = Record<string, (number | string)[]>;

/** Motion props for keyframes `values` at `times` (0–1); the last frame only, under reduced motion. */
interface KfProps {
  initial: false | TargetAndTransition;
  animate: TargetAndTransition;
  transition?: Transition;
}

function useKf() {
  const reduce = useReducedMotion();
  return (values: Frames, times: number[]): KfProps => {
    const last = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v[v.length - 1]!])) as TargetAndTransition;
    if (reduce) return { initial: false, animate: last };
    const first = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v[0]!])) as TargetAndTransition;
    return { initial: first, animate: values as TargetAndTransition, transition: { duration: D, times, ease: "easeInOut" } };
  };
}

/** The finger: moves through `points` and taps (a ripple) at each `taps` time. Hidden at the end. */
function Finger({ points, taps }: { points: { x: number; y: number; t: number }[]; taps: number[] }) {
  const kf = useKf();
  const reduce = useReducedMotion();
  if (reduce) return null; // the final frame already shows the result
  const times = [0, ...points.map((p) => p.t), 1];
  const xs = [points[0]!.x, ...points.map((p) => p.x), points.at(-1)!.x];
  const ys = [points[0]!.y, ...points.map((p) => p.y), points.at(-1)!.y];
  return (
    <>
      <motion.circle r={7} fill={C.accent} {...kf({ cx: xs, cy: ys, opacity: [0, ...points.map(() => 0.9), 0] }, times)} />
      {taps.map((t) => {
        const at = points.reduce((best, p) => (Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best), points[0]!);
        return (
          <motion.circle
            key={t}
            cx={at.x}
            cy={at.y}
            fill="none"
            stroke={C.ring}
            strokeWidth={2}
            {...kf({ r: [6, 6, 18, 18], opacity: [0, 0.9, 0, 0] }, [0, t, Math.min(t + 0.12, 1), 1])}
          />
        );
      })}
    </>
  );
}

const Box = (p: { x: number; y: number; w: number; h: number; lit?: boolean; r?: number }) => (
  <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r ?? 6} fill={C.box} stroke={p.lit ? C.ring : C.edge} strokeWidth={1.5} />
);
const Lines = ({ x, y, w, n = 1 }: { x: number; y: number; w: number; n?: number }) => (
  <path d={Array.from({ length: n }, (_, i) => `M${x} ${y + i * 7}h${w - i * 10}`).join("")} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
);

function NumericDemo() {
  const kf = useKf();
  return (
    <>
      <Box x={20} y={28} w={120} h={40} />
      <motion.g {...kf({ opacity: [0, 0, 1, 1] }, [0, 0.25, 0.3, 1])}>
        <Lines x={36} y={48} w={28} />
      </motion.g>
      <motion.rect x={160} y={28} width={60} height={40} rx={8} stroke={C.edge} strokeWidth={1.5} {...kf({ fill: [C.faint, C.faint, C.accent, C.accent] }, [0, 0.6, 0.65, 1])} />
      <Finger points={[{ x: 80, y: 48, t: 0.2 }, { x: 190, y: 48, t: 0.62 }]} taps={[0.2, 0.62]} />
    </>
  );
}

function BinaryDemo() {
  const kf = useKf();
  const on = [1, 4];
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <motion.rect
          key={i}
          x={22 + i * 34}
          y={30}
          width={26}
          height={36}
          rx={6}
          stroke={C.edge}
          strokeWidth={1.5}
          {...kf({ fill: on.includes(i) ? [C.box, C.box, C.accent, C.accent] : [C.box, C.box] }, on.includes(i) ? [0, i === 1 ? 0.25 : 0.6, i === 1 ? 0.3 : 0.65, 1] : [0, 1])}
        />
      ))}
      <Finger points={[{ x: 69, y: 48, t: 0.25 }, { x: 171, y: 48, t: 0.6 }]} taps={[0.25, 0.6]} />
    </>
  );
}

function DragDemo() {
  const kf = useKf();
  return (
    <>
      <motion.g {...kf({ y: [0, 0, 26, 26] }, [0, 0.3, 0.7, 1])}>
        <Box x={40} y={12} w={160} h={20} />
        <Lines x={54} y={22} w={60} />
      </motion.g>
      <motion.g {...kf({ y: [0, 0, -26, -26] }, [0, 0.3, 0.7, 1])}>
        <Box x={40} y={38} w={160} h={20} lit />
        <Lines x={54} y={48} w={90} />
      </motion.g>
      <Box x={40} y={64} w={160} h={20} />
      <Lines x={54} y={74} w={40} />
      <Finger points={[{ x: 180, y: 48, t: 0.25 }, { x: 180, y: 48, t: 0.3 }, { x: 180, y: 22, t: 0.7 }]} taps={[0.25]} />
    </>
  );
}

function MatchDemo() {
  const kf = useKf();
  return (
    <>
      {[16, 40, 64].map((y) => (
        <g key={y}>
          <Box x={20} y={y} w={70} h={18} />
          <Box x={150} y={y} w={70} h={18} />
        </g>
      ))}
      <motion.path d="M90 25L150 73" stroke={C.ring} strokeWidth={2.5} {...kf({ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 1] }, [0, 0.55, 0.7, 1])} />
      <Finger points={[{ x: 55, y: 25, t: 0.25 }, { x: 185, y: 73, t: 0.6 }]} taps={[0.25, 0.6]} />
    </>
  );
}

function PacketDemo() {
  const kf = useKf();
  const nodes = [
    [30, 48],
    [100, 24],
    [100, 72],
    [170, 48],
    [215, 48],
  ] as const;
  return (
    <>
      <path d="M30 48L100 24L170 48L215 48M30 48L100 72L170 48" stroke={C.faint} strokeWidth={3} fill="none" />
      <motion.path d="M30 48L100 24L170 48L215 48" stroke={C.ring} strokeWidth={3} fill="none" {...kf({ pathLength: [0, 0, 0.45, 0.45, 1, 1] }, [0, 0.2, 0.3, 0.5, 0.75, 1])} />
      {nodes.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={9} fill={C.box} stroke={C.edge} strokeWidth={1.5} />
      ))}
      <Finger points={[{ x: 100, y: 24, t: 0.25 }, { x: 170, y: 48, t: 0.5 }, { x: 215, y: 48, t: 0.75 }]} taps={[0.25, 0.5, 0.75]} />
    </>
  );
}

function TerminalDemo() {
  const kf = useKf();
  return (
    <>
      <rect x={20} y={8} width={200} height={80} rx={8} fill="var(--color-screen)" />
      <path d="M32 26l5 4-5 4" stroke={C.ok} strokeWidth={2} fill="none" />
      <motion.path d="M44 30h40" stroke="var(--color-on-screen)" strokeWidth={3} strokeLinecap="round" {...kf({ pathLength: [0, 0, 1, 1] }, [0, 0.15, 0.4, 1])} />
      <motion.g {...kf({ opacity: [0, 0, 1, 1] }, [0, 0.5, 0.55, 1])}>
        <path d="M32 48h120M32 58h90M32 68h140" stroke="var(--color-on-screen-muted)" strokeWidth={3} strokeLinecap="round" />
      </motion.g>
    </>
  );
}

function PartsScene({ picked, badges }: { picked: number[]; badges?: boolean }) {
  const kf = useKf();
  const parts = [
    { x: 40, y: 22, w: 40, h: 26, t: 0.2 },
    { x: 100, y: 22, w: 30, h: 50, t: 0.45 },
    { x: 150, y: 48, w: 50, h: 24, t: 0.7 },
  ];
  return (
    <>
      <rect x={24} y={10} width={192} height={76} rx={10} fill="var(--color-screen)" />
      {parts.map((p, i) => (
        <g key={i}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={4} fill="var(--color-scene-part)" />
          {picked.includes(i) && (
            <motion.rect x={p.x - 3} y={p.y - 3} width={p.w + 6} height={p.h + 6} rx={6} fill="none" stroke={C.ring} strokeWidth={2} {...kf({ opacity: [0, 0, 1, 1] }, [0, p.t, p.t + 0.05, 1])} />
          )}
          {badges && picked.includes(i) && (
            <motion.circle cx={p.x + p.w} cy={p.y} r={5} fill={C.accent} {...kf({ opacity: [0, 0, 1, 1] }, [0, p.t, p.t + 0.05, 1])} />
          )}
        </g>
      ))}
      <Finger
        points={picked.map((i) => ({ x: parts[i]!.x + parts[i]!.w / 2, y: parts[i]!.y + parts[i]!.h / 2, t: parts[i]!.t }))}
        taps={picked.map((i) => parts[i]!.t)}
      />
    </>
  );
}

function LabelDemo() {
  const kf = useKf();
  return (
    <>
      <rect x={24} y={6} width={192} height={58} rx={10} fill="var(--color-screen)" />
      <rect x={60} y={20} width={40} height={30} rx={4} fill="var(--color-scene-part)" />
      <circle cx={80} cy={35} r={8} fill="var(--color-screen)" stroke={C.ring} strokeWidth={2} />
      <rect x={140} y={20} width={40} height={30} rx={4} fill="var(--color-scene-part)" />
      <circle cx={160} cy={35} r={8} fill="var(--color-screen)" stroke={C.ring} strokeWidth={2} />
      <motion.g {...kf({ x: [0, 0, 18, 18], y: [0, 0, -43, -43] }, [0, 0.35, 0.65, 1])}>
        <rect x={42} y={70} width={40} height={16} rx={4} fill={C.box} stroke={C.ring} strokeWidth={1.5} />
        <Lines x={50} y={78} w={24} />
      </motion.g>
      <rect x={100} y={70} width={40} height={16} rx={4} fill={C.box} stroke={C.edge} strokeWidth={1.5} />
      <Finger points={[{ x: 62, y: 78, t: 0.25 }, { x: 80, y: 35, t: 0.65 }]} taps={[0.25, 0.65]} />
    </>
  );
}

function TeardownDemo() {
  const kf = useKf();
  const screws = [
    [44, 22, 0.15],
    [196, 22, 0.3],
    [44, 74, 0.45],
    [196, 74, 0.6],
  ] as const;
  return (
    <>
      <rect x={28} y={8} width={184} height={80} rx={10} fill="var(--color-scene-board)" />
      <motion.g {...kf({ y: [0, 0, -60, -60], opacity: [1, 1, 0, 0] }, [0, 0.72, 0.9, 1])}>
        <rect x={32} y={12} width={176} height={72} rx={8} fill="var(--color-scene-panel)" stroke={C.edge} />
      </motion.g>
      {screws.map(([x, y, t]) => (
        <motion.circle key={`${x}-${y}`} cx={x} cy={y} r={5} fill={C.edge} {...kf({ opacity: [1, 1, 0, 0] }, [0, t, t + 0.05, 1])} />
      ))}
      <Finger points={[...screws.map(([x, y, t]) => ({ x, y, t })), { x: 120, y: 48, t: 0.72 }]} taps={[...screws.map((s) => s[2]), 0.72]} />
    </>
  );
}

function SimulatorDemo() {
  const kf = useKf();
  return (
    <>
      <Box x={20} y={16} w={90} h={28} />
      <motion.rect x={78} y={24} width={24} height={12} rx={6} {...kf({ fill: [C.accent, C.accent, C.faint, C.faint] }, [0, 0.3, 0.35, 1])} />
      <Box x={20} y={54} w={200} h={26} />
      <motion.rect x={24} y={58} height={18} rx={4} {...kf({ width: [180, 180, 90, 90], fill: ["var(--color-danger)", "var(--color-danger)", C.ok, C.ok] }, [0, 0.35, 0.7, 1])} />
      <Finger points={[{ x: 90, y: 30, t: 0.3 }]} taps={[0.3]} />
    </>
  );
}

function ScenarioDemo() {
  const kf = useKf();
  return (
    <>
      <Lines x={24} y={14} w={180} n={2} />
      <Box x={24} y={34} w={192} h={20} />
      <Box x={24} y={60} w={192} h={20} />
      <motion.rect x={24} y={60} width={192} height={20} rx={6} fill="none" stroke={C.ring} strokeWidth={2} {...kf({ opacity: [0, 0, 1, 1] }, [0, 0.4, 0.45, 1])} />
      <motion.g {...kf({ opacity: [0, 0, 1, 1] }, [0, 0.55, 0.65, 1])}>
        <Lines x={34} y={90} w={140} />
      </motion.g>
      <Finger points={[{ x: 120, y: 70, t: 0.4 }]} taps={[0.4]} />
    </>
  );
}

function SortDemo() {
  const kf = useKf();
  return (
    <>
      <Box x={24} y={50} w={90} h={40} />
      <Box x={126} y={50} w={90} h={40} />
      <motion.g {...kf({ x: [0, 0, 70, 70], y: [0, 0, 50, 50] }, [0, 0.3, 0.7, 1])}>
        <rect x={80} y={10} width={60} height={20} rx={6} fill={C.box} stroke={C.ring} strokeWidth={1.5} />
        <Lines x={90} y={20} w={36} />
      </motion.g>
      <Finger points={[{ x: 110, y: 20, t: 0.25 }, { x: 180, y: 70, t: 0.7 }]} taps={[0.25, 0.7]} />
    </>
  );
}

/** train_model: the problem fruit with the model's guess (a banana shape); tapping the golden apple flips it to an apple. */
function TrainDemo() {
  const kf = useKf();
  const red = "var(--color-pic-red)";
  const yellow = "var(--color-pic-yellow)";
  const apple = (x: number, y: number, fill: string) => (
    <g>
      <circle cx={x} cy={y} r={9} fill={fill} />
      <path d={`M${x} ${y - 9}v-4`} stroke="var(--color-pic-stem)" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
  return (
    <>
      {/* The problem: a yellow apple the model calls a banana. */}
      <rect x={20} y={8} width={130} height={36} rx={6} fill={C.box} stroke={C.edge} strokeWidth={1.5} />
      <rect x={28} y={13} width={26} height={26} rx={4} fill="var(--color-screen)" />
      {apple(41, 28, `color-mix(in oklab, ${yellow} 80%, ${red})`)}
      <motion.path d="M70 20q4 12 16 12" stroke={yellow} strokeWidth={5} strokeLinecap="round" fill="none" {...kf({ opacity: [1, 1, 0, 0] }, [0, 0.5, 0.56, 1])} />
      <motion.circle cx={78} cy={26} r={7} fill={C.ok} {...kf({ opacity: [0, 0, 1, 1], scale: [0.4, 0.4, 1, 1] }, [0, 0.5, 0.6, 1])} />
      {/* Three examples to add; the golden apple fixes it. */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={36 + i * 58} y={56} width={46} height={36} rx={6} fill={C.box} stroke={C.edge} strokeWidth={1.5} />
      ))}
      <motion.rect x={36} y={56} width={46} height={36} rx={6} fill="none" stroke={C.ring} strokeWidth={2.5} {...kf({ opacity: [0, 0, 1, 1] }, [0, 0.42, 0.46, 1])} />
      {apple(59, 76, yellow)}
      {apple(117, 76, red)}
      <path d="M163 68q4 14 18 14" stroke={yellow} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Finger points={[{ x: 59, y: 76, t: 0.42 }]} taps={[0.42]} />
    </>
  );
}

function NextWordDemo() {
  const kf = useKf();
  return (
    <>
      <Box x={24} y={10} w={60} h={10} />
      <Box x={24} y={30} w={130} h={10} />
      <Box x={24} y={50} w={130} h={10} />
      <motion.rect x={24} y={30} height={10} rx={4} fill={C.ink} {...kf({ width: [90, 90, 125, 125] }, [0, 0.4, 0.75, 1])} />
      <motion.rect x={24} y={50} height={10} rx={4} fill={C.ink} {...kf({ width: [40, 40, 8, 8] }, [0, 0.4, 0.75, 1])} />
      <rect x={24} y={78} width={192} height={4} rx={2} fill={C.faint} />
      <motion.circle cy={80} r={8} fill={C.accent} {...kf({ cx: [140, 140, 50, 50] }, [0, 0.4, 0.75, 1])} />
      <Finger points={[{ x: 140, y: 80, t: 0.35 }, { x: 50, y: 80, t: 0.75 }]} taps={[0.35]} />
    </>
  );
}

export const DEMOS: Record<CoachKey, () => ReactNode> = {
  numeric_input: NumericDemo,
  binary_toggle: BinaryDemo,
  drag_to_order: DragDemo,
  match_pairs: MatchDemo,
  packet_path: PacketDemo,
  terminal: TerminalDemo,
  "hotspot-explore": () => <PartsScene picked={[0, 1, 2]} badges />,
  "hotspot-tap": () => <PartsScene picked={[1]} />,
  "hotspot-label": LabelDemo,
  teardown: TeardownDemo,
  simulator: SimulatorDemo,
  scenario: ScenarioDemo,
  sort_bins: SortDemo,
  train_model: TrainDemo,
  next_word: NextWordDemo,
};
