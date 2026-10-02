"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { setAvatarAction, spinRewardAction } from "@/app/actions/rewards";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFeedback } from "@/lib/feedback";
import { itemById, SPIN_POOL } from "@/lib/rewards/items";
import { Avatar } from "./Avatar";

/**
 * The reward spin (every spin wins). A ring of nodes lights in sequence (our loading motif) and
 * lands on the prize the server picked; no near misses, no odds, no "rare". About 1.2 s; the
 * result straight away under reduced motion. Earned by learning, never bought.
 */
export function RewardSpin({ owned, onDone }: { owned: ReadonlySet<string>; onDone: (waiting: number) => void }) {
  const reduce = useReducedMotion();
  const feedback = useFeedback();
  const { refreshProfile } = useAuth();
  const [ring, setRing] = useState(() => SPIN_POOL.filter((i) => !owned.has(i.id)).slice(0, 8).map((i) => i.id));
  const [lit, setLit] = useState<number | null>(null);
  const [won, setWon] = useState<{ id: string; waiting: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function spin() {
    setBusy(true);
    setError(null);
    const result = await spinRewardAction().catch(() => ({ ok: false as const, error: "Couldn't spin. Please try again." }));
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    // Make sure the prize is on the ring, then light round to it.
    const nextRing = ring.includes(result.itemId) ? ring : [...ring.slice(0, Math.max(0, ring.length - 1)), result.itemId];
    setRing(nextRing);
    const target = nextRing.indexOf(result.itemId);
    const finish = () => {
      setWon({ id: result.itemId, waiting: result.waiting });
      setBusy(false);
      feedback.play("lessonComplete");
      feedback.haptic("success");
    };
    if (reduce) return finish();
    const steps = nextRing.length + target;
    let delay = 0;
    for (let s = 0; s <= steps; s++) {
      delay += 50 + (s / steps) * 110; // slows to a stop: ~1.2 s in all
      timers.current.push(window.setTimeout(() => setLit(s % nextRing.length), delay));
    }
    timers.current.push(window.setTimeout(finish, delay + 250));
  }

  if (won) {
    const item = itemById(won.id)!;
    return (
      <div className="flex flex-col items-center text-center">
        <Avatar avatar={won.id} className="size-36" />
        <h2 className="mt-5 text-headline font-semibold">{item.name}</h2>
        <p className="text-ink-muted">New for your avatar.</p>
        <div className="mt-6 w-full space-y-1">
          <Button
            className="w-full"
            onClick={async () => {
              await setAvatarAction(won.id);
              await refreshProfile();
              onDone(won.waiting);
            }}
          >
            Wear it
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onDone(won.waiting)}>
            Not now
          </Button>
        </div>
      </div>
    );
  }

  const r = 104;
  return (
    <div className="flex flex-col items-center text-center">
      <p className="inline-flex rounded-sm border border-accent-ink bg-accent-soft px-2 py-1 text-small">You earned it by learning</p>
      <h2 className="mt-3 text-headline font-semibold">You earned a spin</h2>
      <p className="text-ink-muted">Every spin wins something new.</p>
      <div className="relative my-5 size-[248px]" aria-hidden="true">
        <span className="absolute inset-[26px] rounded-node border-2 border-line" />
        {ring.map((id, i) => {
          const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <span key={id} className="absolute" style={{ left: 124 + Math.cos(angle) * r - 26, top: 124 + Math.sin(angle) * r - 26 }}>
              <Avatar avatar={id} className={`size-[52px] transition-shadow ${lit === i ? "shadow-glow" : "opacity-80"}`} />
            </span>
          );
        })}
        <span className="absolute top-1/2 left-1/2 grid size-[78px] -translate-x-1/2 -translate-y-1/2 place-items-center">
          <Avatar avatar="mascot" className="size-[78px]" />
        </span>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-small text-danger">
          {error}
        </p>
      )}
      <Button className="w-full" onClick={() => void spin()} disabled={busy}>
        Spin
      </Button>
      <ButtonLink href="/account/rewards" variant="ghost" className="mt-1 w-full">
        See all rewards
      </ButtonLink>
      <p className="mt-1 text-caption text-ink-faint">Earned by learning. Never bought.</p>
    </div>
  );
}
