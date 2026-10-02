"use client";

import { useDrag } from "@use-gesture/react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { NetworkMark } from "@/components/network/NetworkMark";
import { useFeedback } from "@/lib/feedback";
import { buzz, markReady, play } from "./juice";

type Fruit = { id: string; name: string; kind: "apple" | "banana"; x: number; y: number };
// x = shape (long → round), y = colour (red → yellow), as in the train_model cards.
const LEARNED: Fruit[] = [
  { id: "a1", name: "Red apple", kind: "apple", x: 9.5, y: 0.5 },
  { id: "a2", name: "Small red apple", kind: "apple", x: 7.5, y: 2 },
  { id: "b1", name: "Banana", kind: "banana", x: 0.5, y: 9.5 },
  { id: "b2", name: "Spotty banana", kind: "banana", x: 1.5, y: 7 },
];
const OFFER: Fruit[] = [
  { id: "g1", name: "Golden apple", kind: "apple", x: 8, y: 9.5 },
  { id: "r1", name: "Dark red apple", kind: "apple", x: 9, y: 1 },
  { id: "s1", name: "Short banana", kind: "banana", x: 3, y: 8.5 },
];
const TEST = { name: "Yellow apple", x: 6, y: 8 };

const guess = (training: Fruit[]) =>
  training.reduce((best, f) => ((f.x - TEST.x) ** 2 + (f.y - TEST.y) ** 2 < (best.x - TEST.x) ** 2 + (best.y - TEST.y) ** 2 ? f : best)).kind;

function FruitPic({ kind, y, size = 48 }: { kind: "apple" | "banana"; y: number; size?: number }) {
  // Red stays red until it's really yellow (a straight mix makes red apples look orange).
  const colour = `color-mix(in oklab, var(--color-pic-yellow) ${Math.round((y / 10) ** 1.8 * 100)}%, var(--color-pic-red))`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      {kind === "banana" ? (
        <path d="M14 18c4 18 18 30 38 30 3 0 4 3 1 4-24 6-44-10-44-32 0-3 4-5 5-2z" fill={colour} />
      ) : (
        <>
          <path d="M32 22c-6-5-20-4-20 12 0 12 9 20 15 20 3 0 3-1 5-1s2 1 5 1c6 0 15-8 15-20 0-16-14-17-20-12z" fill={colour} />
          <path d="M32 22c0-5 1-8 3-10" stroke="var(--color-pic-stem)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Tile({ fruit, target, onIn, reduce }: { fruit: Fruit; target: React.RefObject<HTMLDivElement | null>; onIn: (f: Fruit) => void; reduce: boolean }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ref = useRef<HTMLButtonElement>(null);
  const flyIn = () => {
    const from = ref.current?.getBoundingClientRect();
    const to = target.current?.getBoundingClientRect();
    if (reduce || !from || !to) return onIn(fruit);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    play("whoosh", true);
    void animate(x, dx, { type: "spring", stiffness: 260, damping: 24 });
    void animate(y, dy, { type: "spring", stiffness: 260, damping: 24 }).then(() => onIn(fruit));
  };
  const bind = useDrag(
    ({ down, movement: [mx, my], velocity: [vx, vy], direction: [, dirY], tap }) => {
      if (tap) return flyIn();
      if (down) {
        x.set(mx);
        y.set(my);
        return;
      }
      // Flung upward (towards the model) or dropped over it: in it goes. Otherwise back home.
      const to = target.current?.getBoundingClientRect();
      const from = ref.current?.getBoundingClientRect();
      const over = to && from && from.top < to.bottom && from.bottom > to.top;
      if (over || (dirY < 0 && Math.hypot(vx, vy) > 0.6)) flyIn();
      else {
        void animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
        void animate(y, 0, { type: "spring", stiffness: 500, damping: 30 });
      }
    },
    { filterTaps: true },
  );
  return (
    <motion.button
      ref={ref}
      type="button"
      {...(bind() as object)}
      style={{ x, y, touchAction: "none" }}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          flyIn();
        }
      }}
      className="flex min-h-11 flex-col items-center gap-1 rounded-control border-2 border-line bg-surface p-2 text-caption text-ink"
      aria-label={`Teach the model: ${fruit.name}`}
    >
      <span className="rounded-control bg-screen">
        <FruitPic kind={fruit.kind} y={fruit.y} size={44} />
      </span>
      {fruit.name}
    </motion.button>
  );
}

export default function FruitTrainer() {
  const reduce = useReducedMotion() ?? false;
  const feedback = useFeedback();
  const model = useRef<HTMLDivElement>(null);
  const [learned, setLearned] = useState<Fruit[]>([]);
  const training = [...LEARNED, ...learned];
  const current = guess(training);
  const right = current === "apple";
  useEffect(() => markReady(reduce ? "reduced-motion" : undefined), [reduce]);

  const onIn = (f: Fruit) => {
    setLearned((l) => [...l, f]);
    const nowRight = guess([...training, f]) === "apple";
    if (nowRight && !right) {
      play("ding", feedback.enabled);
      buzz(reduce);
    } else play("snap", feedback.enabled);
  };

  return (
    <section aria-label="Train the model" className="space-y-3">
      <p className="text-lead font-semibold">Fling a fruit into the model to fix its guess.</p>
      <div ref={model} className="flex items-center gap-3 rounded-card border-2 border-line-strong bg-surface p-3">
        <NetworkMark mode={right ? "lit" : "dim"} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <span className="rounded-control bg-screen">
              <FruitPic kind="apple" y={TEST.y} size={32} />
            </span>
            {TEST.name}
          </p>
          <p aria-live="polite" className="mt-1 text-small text-ink-muted [perspective:400px]">
            Model&apos;s guess:{" "}
            <motion.strong key={current} initial={reduce ? false : { rotateX: 90 }} animate={{ rotateX: 0 }} className={`inline-block ${right ? "text-success" : "text-danger"}`}>
              {current === "apple" ? "Apple ✓" : "Banana ✗"}
            </motion.strong>
          </p>
          <p className="mt-1 text-caption text-ink-faint">Learned from {training.length} fruit</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OFFER.filter((f) => !learned.some((l) => l.id === f.id)).map((f) => (
          <Tile key={f.id} fruit={f} target={model} onIn={onIn} reduce={reduce} />
        ))}
      </div>
      {learned.length > 0 && (
        <button type="button" className="min-h-11 text-small font-semibold text-accent-ink" onClick={() => setLearned([])}>
          Start again
        </button>
      )}
    </section>
  );
}
