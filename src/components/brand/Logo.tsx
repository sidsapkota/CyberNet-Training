import { connectorPath, HUB, MARK_STROKE, MARK_VIEWBOX, NODE_R, NODES, SHIELD_PATH } from "./geometry";

type MarkVariant = "color" | "mono" | "tile";

/**
 * The CyberNet mark.
 * - `color`: cyan on transparent (for navy backgrounds)
 * - `mono`: single colour, inherits `currentColor`
 * - `tile`: cyan on a rounded navy square; readable on any background (header, favicon)
 */
export function LogoMark({
  variant = "tile",
  className = "",
  title,
}: {
  variant?: MarkVariant;
  className?: string;
  title?: string;
}) {
  const color = variant === "mono" ? "currentColor" : "var(--color-accent)";
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {variant === "tile" && <rect width="64" height="64" rx="14" fill="var(--color-screen)" />}
      <g
        fill="none"
        stroke={color}
        strokeWidth={MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={SHIELD_PATH} />
        {NODES.map((n) => (
          <path key={`${n.x}-${n.y}`} d={connectorPath(n)} />
        ))}
      </g>
      <g fill={color}>
        <circle cx={HUB.x} cy={HUB.y} r={HUB.r} />
        {NODES.map((n) => (
          <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r={NODE_R} />
        ))}
      </g>
    </svg>
  );
}

/** Horizontal lockup: tile mark + "CyberNet Training" wordmark. */
export function LogoLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 max-[399px]:gap-2 ${className}`}>
      <LogoMark variant="tile" className="size-9 shrink-0" />
      {/* Below 400px the wordmark is a size smaller, and below 380px only the tile shows (the
          link's label still names the site), so the header with XP and streak fits on one line. */}
      <span className="text-lead leading-none tracking-tight whitespace-nowrap max-[399px]:text-body max-[379px]:sr-only">
        <span className="font-semibold text-ink">CyberNet</span>
        {/* Dropped on the narrowest phones so the header stays on one line. */}
        <span className="font-normal text-ink-muted max-[399px]:hidden"> Training</span>
      </span>
    </span>
  );
}
