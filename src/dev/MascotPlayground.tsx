"use client";

import { useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { MASCOT_EXPRESSIONS, type MascotExpression } from "@/components/mascot/poses";
import type { MascotReaction } from "@/components/mascot/reactions";
import { Button } from "@/components/ui/Button";

const SIZES = [48, 96, 200] as const;

/**
 * Dev-only mascot sheet: every expression at several sizes, on a dark and a light panel.
 * The theme tokens resolve light-dark() once at :root, so the panels use each theme's literal
 * canvas and text colours (dev preview only; never copy raw hex into product UI).
 */
const PANELS = [
  { name: "dark", background: "#061630", color: "#c9d6ea" },
  { name: "light", background: "#f4f7fb", color: "#0b2142" },
] as const;
export function MascotPlayground() {
  const [idle, setIdle] = useState(true);
  const [live, setLive] = useState<MascotExpression>("happy");
  // Each press remounts the mascot with the reaction, so it plays again.
  const [reaction, setReaction] = useState<{ name: MascotReaction; n: number } | null>(null);
  const playReaction = (name: MascotReaction, expression: MascotExpression) => {
    setLive(expression);
    setReaction((r) => ({ name, n: (r?.n ?? 0) + 1 }));
  };

  const next = () => setLive(MASCOT_EXPRESSIONS[(MASCOT_EXPRESSIONS.indexOf(live) + 1) % MASCOT_EXPRESSIONS.length]!);

  return (
    <main className="mx-auto max-w-wide px-gutter py-8">
      <h1 className="text-headline font-semibold">Mascot (dev)</h1>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-small font-semibold">
          <input type="checkbox" checked={idle} onChange={(e) => setIdle(e.target.checked)} />
          Idle animation (blink, antenna pulse, wave)
        </label>
        <Button variant="secondary" onClick={next}>
          Next expression (bounce): {live}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Reactions">
        <Button variant="secondary" onClick={() => playReaction("bob", "happy")}>Bob (appear)</Button>
        <Button variant="secondary" onClick={() => playReaction("hop", "happy")}>Hop (right)</Button>
        <Button variant="secondary" onClick={() => playReaction("tilt", "confused")}>Tilt (wrong)</Button>
        <Button variant="secondary" onClick={() => playReaction("scan", "celebrating")}>Security scan</Button>
      </div>

      <section className="mt-6 flex items-end gap-6 rounded-card border border-line bg-surface p-6">
        <Mascot key={reaction?.n ?? 0} expression={live} size={220} idle={idle} reaction={reaction?.name} label />
        <p className="font-mono text-small text-ink-muted">{live}</p>
      </section>

      {PANELS.map(({ name, background, color }) => (
        <section key={name} style={{ background, color }} className="mt-6 rounded-card border border-line p-6">
          <h2 className="font-mono text-caption tracking-widest uppercase opacity-70">{name} canvas</h2>
          <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {MASCOT_EXPRESSIONS.map((expression) => (
              <figure key={expression} className="flex flex-col gap-2">
                <div className="flex items-end gap-4">
                  {SIZES.map((size) => (
                    <Mascot key={size} expression={expression} size={size} idle={idle} />
                  ))}
                </div>
                <figcaption className="font-mono text-caption opacity-80">{expression}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
