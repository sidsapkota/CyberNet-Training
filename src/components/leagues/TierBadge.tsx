import { SHIELD_PATH } from "@/components/brand/geometry";
import { type Tier, TIER_NAMES } from "@/lib/leagues/tiers";

/**
 * League tier badges, on the logo's own shield (64-unit grid). Fixed colours in both themes, like
 * the mascot, on a navy tile. Each step up changes the fill as well as the icon, so tiers stay
 * easy to tell apart at small sizes (and the name is always shown beside them, never colour alone):
 * - Packet, Switch: outline only.
 * - Router, Firewall: a solid dark-cyan shield.
 * - Server, Mainframe: reversed, a bright cyan shield with a navy icon.
 * - Quantum: purple accents and a soft purple glow (purple belongs to Quantum alone).
 * Network nodes grow with the tier: none, then a node chain at the point, then nodes on the sides.
 */

const LINE = "var(--color-tier-line)";
const DARK = "var(--color-tier-fill)";
const NAVY = "var(--color-tier-ground)";
const QUANTUM = "var(--color-quantum)";

type Look = { fill: string; icon: string; nodes: "none" | "point" | "sides"; nodeColour: string };

const LOOKS: Record<Tier, Look> = {
  packet: { fill: "none", icon: LINE, nodes: "none", nodeColour: LINE },
  switch: { fill: "none", icon: LINE, nodes: "point", nodeColour: LINE },
  router: { fill: DARK, icon: LINE, nodes: "point", nodeColour: LINE },
  firewall: { fill: DARK, icon: LINE, nodes: "point", nodeColour: LINE },
  server: { fill: LINE, icon: NAVY, nodes: "sides", nodeColour: LINE },
  mainframe: { fill: LINE, icon: NAVY, nodes: "sides", nodeColour: LINE },
  quantum: { fill: NAVY, icon: LINE, nodes: "sides", nodeColour: QUANTUM },
};

/** The icon inside the shield, drawn in `c`. Sharp corners for walls and cabinets. */
function TierIcon({ tier, c }: { tier: Tier; c: string }) {
  const stroke = { stroke: c, strokeWidth: 2.4, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (tier) {
    case "packet":
      return (
        <g {...stroke}>
          <rect x="20" y="23" width="24" height="17" rx="2" />
          <path d="M20.8 24.2 32 32.5l11.2-8.3" />
        </g>
      );
    case "switch":
      return (
        <g>
          <rect x="17.5" y="24" width="29" height="13" rx="2" {...stroke} />
          {[20.5, 26.5, 32.5, 38.5].map((x) => (
            <rect key={x} x={x} y="28" width="4.5" height="5" rx="0.6" fill={c} />
          ))}
        </g>
      );
    case "router":
      return (
        <g>
          <path d="M23 29V20.5M41 29V20.5" {...stroke} />
          <circle cx="23" cy="19.5" r="2" fill={c} />
          <circle cx="41" cy="19.5" r="2" fill={c} />
          <rect x="18.5" y="29" width="27" height="10" rx="2" fill={c} />
          <circle cx="24" cy="34" r="1.5" fill={DARK} />
          <circle cx="29" cy="34" r="1.5" fill={DARK} />
          <circle cx="38" cy="34" r="1.5" fill={DARK} />
        </g>
      );
    case "firewall":
      // Sharp, even bricks in three staggered courses.
      return (
        <g fill={c}>
          {[
            [18.5, 21, 8], [27.5, 21, 9], [37.5, 21, 8],
            [18.5, 27.5, 4], [23.5, 27.5, 8.5], [33, 27.5, 8.5], [42.5, 27.5, 3],
            [18.5, 34, 8], [27.5, 34, 9], [37.5, 34, 8],
          ].map(([x, y, w]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height="5.5" />
          ))}
        </g>
      );
    case "server":
      // One rack: three units, each with a slot and a lit dot.
      return (
        <g>
          {[19, 26.5, 34].map((y) => (
            <g key={y}>
              <rect x="22" y={y} width="20" height="6" rx="1" fill={c} />
              <rect x="25" y={y + 2.4} width="8" height="1.3" rx="0.6" fill={LINE} />
              <circle cx="38" cy={y + 3} r="1.3" fill={LINE} />
            </g>
          ))}
        </g>
      );
    case "mainframe":
      // A wide multi-cabinet unit: three cabinets side by side, rows of lit dots, a plinth.
      return (
        <g>
          <rect x="14.5" y="18" width="35" height="23" rx="1" fill={c} />
          {[25.8, 37.2].map((x) => (
            <rect key={x} x={x} y="18" width="1.2" height="23" fill={LINE} />
          ))}
          {[17.5, 29, 40.5].map((x) =>
            [21.5, 26.5, 31.5, 36.5].map((y) => (
              <g key={`${x}-${y}`}>
                <circle cx={x + 1.2} cy={y} r="1.1" fill={LINE} />
                <circle cx={x + 4.6} cy={y} r="1.1" fill={LINE} />
              </g>
            )),
          )}
          <rect x="13" y="41" width="38" height="2.5" rx="0.8" fill={c} />
        </g>
      );
    case "quantum":
      return (
        <g {...stroke} strokeWidth={2}>
          <ellipse cx="32" cy="30" rx="13" ry="5.5" />
          <ellipse cx="32" cy="30" rx="13" ry="5.5" transform="rotate(60 32 30)" />
          <ellipse cx="32" cy="30" rx="13" ry="5.5" transform="rotate(-60 32 30)" />
          <circle cx="32" cy="30" r="3" fill={QUANTUM} stroke="none" />
          <circle cx="44" cy="27" r="1.6" fill={QUANTUM} stroke="none" />
          <circle cx="24.5" cy="40" r="1.6" fill={QUANTUM} stroke="none" />
        </g>
      );
  }
}

/** Network nodes on the shield: a chain at the point, then also the sides and the apex. */
function ShieldNodes({ nodes, colour }: { nodes: Look["nodes"]; colour: string }) {
  if (nodes === "none") return null;
  const dot = (cx: number, cy: number, r = 2.2) => <circle cx={cx} cy={cy} r={r} fill={colour} stroke={NAVY} strokeWidth="1" />;
  return (
    <g>
      <path d="M24 46.5 32 51.5 40 46.5" stroke={colour} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      {dot(24, 46.5, 1.8)}
      {dot(40, 46.5, 1.8)}
      {dot(32, 57.5)}
      {nodes === "sides" && (
        <>
          {dot(11.5, 31)}
          {dot(52.5, 31)}
          {dot(32, 7.5)}
        </>
      )}
    </g>
  );
}

export function TierBadge({
  tier,
  className = "size-12",
  tile = true,
  title,
}: {
  tier: Tier;
  className?: string;
  /** Draw the navy tile behind the shield (off where the badge already sits on navy). */
  tile?: boolean;
  /** Accessible name; omit when the tier name is written next to the badge (then it's decorative). */
  title?: string;
}) {
  const look = LOOKS[tier];
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {tile && <rect width="64" height="64" rx="12" fill={NAVY} />}
      {/* Quantum's soft purple glow is on the shield only, not the tile. */}
      <g className={tier === "quantum" ? "drop-shadow-quantum" : undefined}>
        <path d={SHIELD_PATH} fill={look.fill} stroke={tier === "quantum" ? QUANTUM : LINE} strokeWidth="3" strokeLinejoin="round" />
        {tier === "quantum" && (
          <path d={SHIELD_PATH} fill="none" stroke={LINE} strokeWidth="1.2" transform="translate(32 32.5) scale(0.86) translate(-32 -32.5)" />
        )}
        <TierIcon tier={tier} c={look.icon} />
        <ShieldNodes nodes={look.nodes} colour={look.nodeColour} />
      </g>
    </svg>
  );
}

/** The badge with its name beside it ("Router"), the way tiers are always shown. */
export function TierLabel({ tier, className = "", badgeClassName = "size-6" }: { tier: Tier; className?: string; badgeClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TierBadge tier={tier} className={badgeClassName} />
      <span>{TIER_NAMES[tier]}</span>
    </span>
  );
}
