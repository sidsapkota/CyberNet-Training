/**
 * The streak glyph: three nodes on a 45° trace, the network motif's version of a streak (no flame).
 * `lit` fills the nodes (today's goal met); unlit, they're outlines. Drawn on lucide's 24-unit grid
 * with the same stroke, so it sits with the other icons. Decorative: the text beside it says the
 * streak in words.
 */
const NODES: [number, number][] = [
  [5, 19],
  [12, 12],
  [19, 5],
];

export function StreakIcon({ lit, className = "" }: { lit: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      {/* Connectors between the node edges (radius 3 along the diagonal). */}
      <path d="M7.1 16.9 9.9 14.1M14.1 9.9 16.9 7.1" />
      {NODES.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={3} fill={lit ? "currentColor" : "none"} />
      ))}
    </svg>
  );
}
