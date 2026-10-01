"use client";

import Matter from "matter-js";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/lib/feedback";
import { buzz, looksSlow, markReady, play, prefersReducedMotion, tokenColor } from "./juice";

const WORD = ["H", "E", "L", "L", "O"];
const LOST = 2; // the third packet goes missing on the way
const H = 300;

type Status = { phase: "idle" | "racing" | "missing" | "done"; arrived: boolean[] };

export default function PacketRace() {
  const reduce = useReducedMotion() ?? false;
  const feedback = useFeedback();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const sendRef = useRef<(index: number, resend?: boolean) => void>(() => {});
  const [status, setStatus] = useState<Status>({ phase: "idle", arrived: WORD.map(() => false) });
  // Decided once on mount (client-only component): reduced motion or a slow device → still diagram.
  const [mode] = useState<"physics" | "still">(() => (prefersReducedMotion() || looksSlow() ? "still" : "physics"));
  useEffect(() => {
    if (mode === "still") markReady(prefersReducedMotion() ? "reduced-motion" : "slow");
  }, [mode]);

  useEffect(() => {
    if (mode !== "physics" || !canvas.current) return;
    const el = canvas.current;
    const W = el.clientWidth;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = W * dpr;
    el.height = H * dpr;
    const ctx = el.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const c = {
      line: tokenColor("screen-line"),
      ink: tokenColor("on-screen"),
      muted: tokenColor("on-screen-muted"),
      accent: tokenColor("screen-accent"),
      danger: tokenColor("screen-danger"),
      router: tokenColor("scene-panel"),
      navy: tokenColor("screen"),
    };
    const { Engine, Bodies, Body, Composite, Events } = Matter;
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engineRef.current = engine;
    const walls = [Bodies.rectangle(W / 2, -10, W, 20, { isStatic: true }), Bodies.rectangle(W / 2, H + 10, W, 20, { isStatic: true })];
    // Routers: pegs in three columns, offset like a pinball board.
    const routers: Matter.Body[] = [];
    [0.32, 0.5, 0.68].forEach((fx, col) =>
      [0.22, 0.5, 0.78].forEach((fy) => routers.push(Bodies.circle(W * fx, H * fy + (col === 1 ? 0 : 18) - (col === 1 ? 18 : 0), 14, { isStatic: true, restitution: 0.9, label: "router" }))),
    );
    Composite.add(engine.world, [...walls, ...routers]);
    const packets = new Map<number, Matter.Body>();
    const resent = new Set<number>();
    const arrived = WORD.map(() => false);
    const puffs: { x: number; y: number; t: number }[] = [];

    sendRef.current = (i: number, again = false) => {
      const p = Bodies.circle(28, H / 2 + (i - 2) * 26, 10, { restitution: 0.8, frictionAir: 0.02, label: `p${i}` });
      Body.setVelocity(p, { x: 4 + Math.random(), y: (Math.random() - 0.5) * 3 });
      packets.set(i, p);
      if (again) resent.add(i);
      Composite.add(engine.world, p);
    };
    let lostDone = false;
    Events.on(engine, "beforeUpdate", () => {
      for (const [i, p] of packets) {
        Body.applyForce(p, p.position, { x: 0.00045 * p.mass, y: 0 });
        // The lost packet: gone among the middle routers the first time (a puff shows where).
        if (i === LOST && !resent.has(LOST) && !lostDone && p.position.x > W * 0.5) {
          lostDone = true;
          puffs.push({ x: p.position.x, y: p.position.y, t: performance.now() });
          Composite.remove(engine.world, p);
          packets.delete(LOST);
          play("soft", feedback.enabled);
          continue;
        }
        if (p.position.x > W - 34) {
          Composite.remove(engine.world, p);
          packets.delete(i);
          arrived[i] = true;
          play("snap", feedback.enabled);
          const done = arrived.every(Boolean);
          setStatus({ phase: done ? "done" : arrived.filter(Boolean).length === WORD.length - 1 && !resent.has(LOST) ? "missing" : "racing", arrived: [...arrived] });
          if (done) {
            play("ding", feedback.enabled);
            buzz(reduce);
          }
        }
      }
    });
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      Engine.update(engine, Math.min(32, now - last));
      last = now;
      ctx.clearRect(0, 0, W, H);
      // Phones at each end.
      for (const [x, label] of [[4, "You"], [W - 30, "Friend"]] as const) {
        ctx.strokeStyle = c.line;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, H / 2 - 40, 26, 80);
        ctx.fillStyle = c.muted;
        ctx.font = "11px var(--font-sans), sans-serif";
        ctx.fillText(label, x - 2, H / 2 + 56);
      }
      for (const r of routers) {
        ctx.fillStyle = c.router;
        ctx.beginPath();
        ctx.arc(r.position.x, r.position.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.line;
        ctx.stroke();
      }
      for (const [i, p] of packets) {
        ctx.fillStyle = resent.has(i) ? c.accent : c.ink;
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.navy;
        ctx.font = "bold 11px var(--font-mono), monospace";
        ctx.textAlign = "center";
        ctx.fillText(WORD[i]!, p.position.x, p.position.y + 4);
        ctx.textAlign = "start";
      }
      for (const puff of puffs) {
        const age = (now - puff.t) / 500;
        if (age > 1) continue;
        ctx.strokeStyle = c.danger;
        ctx.globalAlpha = 1 - age;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, 10 + age * 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    markReady();
    return () => {
      cancelAnimationFrame(raf);
      Matter.Engine.clear(engine);
    };
  }, [mode, feedback.enabled, reduce]);

  // When only the lost packet is missing, the friend's phone asks for it again.
  useEffect(() => {
    if (status.phase !== "missing") return;
    const t = setTimeout(() => sendRef.current(LOST, true), 700);
    return () => clearTimeout(t);
  }, [status.phase]);

  const send = () => {
    setStatus({ phase: "racing", arrived: WORD.map(() => false) });
    play("whoosh", feedback.enabled);
    WORD.forEach((_, i) => setTimeout(() => sendRef.current(i), i * 220));
  };

  return (
    <section aria-label="Packet race" className="space-y-3">
      <p className="text-lead font-semibold">Send a message. Watch the pieces race.</p>
      {mode === "physics" ? (
        <canvas ref={canvas} className="h-[300px] w-full touch-none rounded-card bg-screen" aria-hidden="true" />
      ) : (
        <div className="flex h-[300px] items-center justify-center gap-2 rounded-card bg-screen font-mono text-on-screen">
          {WORD.map((ch, i) => (
            <span key={i} className={`grid size-9 place-items-center rounded-node ${i === LOST ? "bg-screen-accent text-on-accent" : "bg-on-screen text-screen"}`}>
              {ch}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5" aria-live="polite">
        {WORD.map((ch, i) => (
          <span key={i} className={`grid size-8 place-items-center rounded-sm border-2 font-mono ${status.arrived[i] || mode === "still" ? "border-success text-ink" : "border-line text-ink-faint"}`}>
            {status.arrived[i] || mode === "still" ? ch : "?"}
          </span>
        ))}
        <span className="ml-2 text-small text-ink-muted">
          {mode === "still"
            ? "Piece 3 got lost, so it was sent again."
            : status.phase === "missing"
              ? "Piece 3 is missing. Asking again…"
              : status.phase === "done"
                ? "Message complete!"
                : status.phase === "racing"
                  ? "On their way…"
                  : ""}
        </span>
      </div>
      {mode === "physics" && (
        <Button className="w-full" onClick={send} disabled={status.phase === "racing" || status.phase === "missing"}>
          {status.phase === "done" ? "Send again" : "Send"}
        </Button>
      )}
    </section>
  );
}
