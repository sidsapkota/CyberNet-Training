/**
 * Real-looking pictures for train_model items (zero-confusion rule: show, don't describe). Each is
 * drawn from the item's own data: what it is comes from its name ("Golden apple" is an apple, even
 * when a card deliberately mislabels it), and how it looks from its x and y (colour, size, cloud,
 * brightness). Decorative: the item's name is always shown beside it.
 */
import type { PictureScene } from "./schema";

const mix = (from: string, to: string, t: number) => `color-mix(in oklab, var(${to}) ${Math.round(Math.min(1, Math.max(0, t)) * 100)}%, var(${from}))`;
const has = (text: string, ...words: string[]) => words.some((w) => text.toLowerCase().includes(w));

function Fruit({ text, y }: { text: string; y: number }) {
  const colour = mix("--color-pic-red", "--color-pic-yellow", y / 10);
  const scale = has(text, "small", "mini") ? 0.82 : has(text, "big", "large") ? 1.1 : 1;
  const t = `translate(32 34) scale(${scale}) translate(-32 -34)`;
  if (has(text, "banana")) {
    return (
      <g transform={t}>
        <path d="M14 18c4 18 18 30 38 30 3 0 4 3 1 4-24 6-44-10-44-32 0-3 4-5 5-2z" fill={colour} stroke="var(--color-pic-sky-night)" strokeOpacity={0.25} strokeWidth={1.5} />
        <path d="M12 16l-2-5 4-1 2 5z" fill="var(--color-pic-stem)" />
        {has(text, "spotty", "ripe") && (
          <g fill="var(--color-pic-stem)" opacity={0.7}>
            <circle cx={22} cy={34} r={1.6} />
            <circle cx={31} cy={42} r={1.4} />
            <circle cx={40} cy={46} r={1.6} />
          </g>
        )}
      </g>
    );
  }
  if (has(text, "lemon")) {
    return (
      <g transform={t}>
        <path d="M10 34c0-11 10-18 22-18s22 7 22 18-10 18-22 18S10 45 10 34z" fill={colour} stroke="var(--color-pic-sky-night)" strokeOpacity={0.25} strokeWidth={1.5} />
        <path d="M54 34l5-1-1 3zM10 34l-5 1 1-3z" fill={colour} />
        <ellipse cx={24} cy={27} rx={5} ry={2.5} fill="var(--color-pic-cloud)" opacity={0.35} />
      </g>
    );
  }
  return (
    <g transform={t}>
      <path d="M32 22c-6-5-20-4-20 12 0 12 9 20 15 20 3 0 3-1 5-1s2 1 5 1c6 0 15-8 15-20 0-16-14-17-20-12z" fill={colour} stroke="var(--color-pic-sky-night)" strokeOpacity={0.25} strokeWidth={1.5} />
      <path d="M32 22c0-5 1-8 3-10" stroke="var(--color-pic-stem)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M35 14c5-4 10-2 11 0-4 3-8 3-11 0z" fill="var(--color-pic-leaf)" />
      <ellipse cx={22} cy={30} rx={4} ry={2.5} fill="var(--color-pic-cloud)" opacity={0.35} />
    </g>
  );
}

function Ball({ text, x }: { text: string; x: number }) {
  const r = 9 + x * 1.9;
  if (has(text, "tennis")) {
    return (
      <g>
        <circle cx={32} cy={32} r={r} fill="var(--color-pic-tennis)" stroke="var(--color-pic-sky-night)" strokeOpacity={0.2} strokeWidth={1.5} />
        <path d={`M${32 - r * 0.7} ${32 - r * 0.7}q${r * 0.9} ${r * 0.7} 0 ${r * 1.4}M${32 + r * 0.7} ${32 - r * 0.7}q${-r * 0.9} ${r * 0.7} 0 ${r * 1.4}`} stroke="var(--color-pic-cloud)" strokeWidth={2} fill="none" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={32} cy={32} r={r} fill="var(--color-pic-basket)" stroke="var(--color-pic-sky-night)" strokeOpacity={0.3} strokeWidth={1.5} />
      <path d={`M${32 - r} 32h${r * 2}M32 ${32 - r}v${r * 2}`} stroke="var(--color-pic-sky-night)" strokeOpacity={0.45} strokeWidth={1.5} />
      <path d={`M${32 - r * 0.7} ${32 - r * 0.7}q${r * 0.5} ${r * 0.7} 0 ${r * 1.4}M${32 + r * 0.7} ${32 - r * 0.7}q${-r * 0.5} ${r * 0.7} 0 ${r * 1.4}`} stroke="var(--color-pic-sky-night)" strokeOpacity={0.45} strokeWidth={1.5} fill="none" />
    </g>
  );
}

function Cloud({ cx, cy, s, colour }: { cx: number; cy: number; s: number; colour: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`} fill={colour}>
      <circle cx={-6} cy={2} r={6} />
      <circle cx={2} cy={-2} r={8} />
      <circle cx={10} cy={3} r={5} />
      <rect x={-12} y={2} width={26} height={6} rx={3} />
    </g>
  );
}

function Weather({ x, y }: { x: number; y: number }) {
  const sky = mix("--color-pic-sky-day", "--color-pic-cloud-dark", x / 10);
  const cloud = mix("--color-pic-cloud", "--color-pic-cloud-dark", (x - 4) / 8);
  const clouds = Math.round(x / 3.4);
  const drops = Math.round(y / 2.2);
  return (
    <g>
      <rect x={4} y={4} width={56} height={56} rx={8} fill={sky} />
      {x < 6 && <circle cx={44} cy={18} r={8} fill="var(--color-pic-sun)" />}
      {[
        [24, 20, 1],
        [40, 26, 0.9],
        [22, 34, 0.85],
      ]
        .slice(0, clouds)
        .map(([cx, cy, s], i) => (
          <Cloud key={i} cx={cx!} cy={cy!} s={s!} colour={cloud} />
        ))}
      {Array.from({ length: drops }, (_, i) => (
        <circle key={i} cx={12 + ((i * 11) % 40)} cy={44 + ((i * 7) % 12)} r={1.6} fill="var(--color-pic-rain)" />
      ))}
    </g>
  );
}

function DayNight({ x, y }: { x: number; y: number }) {
  const skyH = Math.round(8 + (y / 10) * 40);
  const sky = mix("--color-pic-sky-night", "--color-pic-sky-day", x / 10);
  const indoors = y < 2;
  const lower = indoors ? mix("--color-pic-sky-night", "--color-pic-wall", x / 10) : mix("--color-pic-sky-night", "--color-pic-ground", 0.25 + x / 14);
  return (
    <g>
      <rect x={4} y={4} width={56} height={56} rx={8} fill={lower} />
      <rect x={indoors ? 18 : 4} y={indoors ? 12 : 4} width={indoors ? 28 : 56} height={indoors ? 14 : skyH} rx={indoors ? 2 : 8} fill={sky} />
      {!indoors && x >= 6 && <circle cx={46} cy={14} r={6} fill="var(--color-pic-sun)" />}
      {!indoors && x < 5 && (
        <g fill="var(--color-pic-moon)">
          <circle cx={46} cy={13} r={5} />
          <circle cx={14} cy={10} r={1} />
          <circle cx={26} cy={16} r={1} />
          <circle cx={34} cy={9} r={1} />
        </g>
      )}
      {indoors && (
        <g>
          <path d="M32 30v6" stroke="var(--color-pic-stem)" strokeWidth={1.5} />
          <circle cx={32} cy={40} r={4} fill={x >= 5 ? "var(--color-pic-sun)" : "var(--color-pic-cloud-dark)"} />
        </g>
      )}
    </g>
  );
}

/** One item's picture on a small navy tile. */
export function ItemPicture({ scene, text, x = 5, y = 5, className = "size-12" }: { scene: PictureScene; text: string; x?: number; y?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 rounded-control bg-screen ${className}`}>
      {scene === "fruit" && <Fruit text={text} y={y} />}
      {scene === "ball" && <Ball text={text} x={x} />}
      {scene === "weather" && <Weather x={x} y={y} />}
      {scene === "daynight" && <DayNight x={x} y={y} />}
    </svg>
  );
}

/** A chat bubble for word-vote cards (the message itself is the picture). */
export function MessageBubble({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`inline-block rounded-card rounded-bl-sm bg-surface-raised px-3 py-1.5 text-small text-ink ${className}`}>{text}</span>;
}
