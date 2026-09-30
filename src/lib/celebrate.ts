/**
 * A short confetti burst in brand colours, for completing a module. canvas-confetti is loaded only
 * when this runs, and nothing happens at all under prefers-reduced-motion.
 */

/** Resolves a colour token (which may use light-dark()) to the hex canvas-confetti needs. */
function tokenHex(token: string): string | null {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  if (!m) return null;
  return `#${m
    .slice(1, 4)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function celebrate(origin: { x: number; y: number } = { x: 0.5, y: 0.35 }): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { default: confetti } = await import("canvas-confetti");
  const colors = ["--color-accent", "--color-success", "--color-screen-accent", "--color-on-screen"]
    .map(tokenHex)
    .filter((c): c is string => c !== null);

  const shared = { colors, origin, disableForReducedMotion: true, ticks: 140, scalar: 0.9, zIndex: 60 };
  void confetti({ ...shared, particleCount: 70, spread: 70, startVelocity: 38 });
  void confetti({ ...shared, particleCount: 40, spread: 110, startVelocity: 26, shapes: ["circle"] });
}
