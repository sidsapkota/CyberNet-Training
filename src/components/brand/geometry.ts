/**
 * The CyberNet mark, on a 64×64 grid: a symmetric shield containing a hub node joined to four
 * nodes on exact 45° diagonals. Every brand drawing (logo, favicon, network motif) derives
 * from these numbers, so keep them the single source of truth.
 */
export const MARK_VIEWBOX = "0 0 64 64";

/** One even stroke weight for the shield outline and the connectors. */
export const MARK_STROKE = 3;

/** Symmetric about x = 32. Apex at the top, point at the bottom. */
export const SHIELD_PATH =
  "M32 7.5C25.5 11.5 18.5 14 11.5 15.5V31C11.5 44 19.5 51.5 32 57.5C44.5 51.5 52.5 44 52.5 31V15.5C45.5 14 38.5 11.5 32 7.5Z";

export const HUB = { x: 32, y: 31.5, r: 6 } as const;

const OFFSET = 10;
export const NODE_R = 4.25;

/** Outer nodes: top-left, top-right, bottom-right, bottom-left (clockwise). */
export const NODES = [
  { x: HUB.x - OFFSET, y: HUB.y - OFFSET },
  { x: HUB.x + OFFSET, y: HUB.y - OFFSET },
  { x: HUB.x + OFFSET, y: HUB.y + OFFSET },
  { x: HUB.x - OFFSET, y: HUB.y + OFFSET },
] as const;

/** Connector from the hub's edge to a node's edge, so strokes never overlap the circles. */
export function connectorPath(node: { x: number; y: number }): string {
  const dx = node.x - HUB.x;
  const dy = node.y - HUB.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const round = (n: number) => Math.round(n * 100) / 100;
  return `M${round(HUB.x + ux * HUB.r)} ${round(HUB.y + uy * HUB.r)}L${round(node.x - ux * NODE_R)} ${round(node.y - uy * NODE_R)}`;
}

/** Brand colours for static assets (SVG files, app icons) that can't use CSS tokens. */
export const BRAND = {
  cyan: "#00C2FF",
  navy: "#061630",
  navyDeep: "#041937",
} as const;

/** Standalone SVG markup for static files. `tile` puts the mark on a rounded navy square. */
export function markSvg({
  color = BRAND.cyan,
  tile = false,
  size = 64,
}: {
  color?: string;
  tile?: boolean;
  size?: number;
} = {}): string {
  const connectors = NODES.map((n) => `<path d="${connectorPath(n)}"/>`).join("");
  const nodes = NODES.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${NODE_R}"/>`).join("");
  const background = tile ? `<rect width="64" height="64" rx="14" fill="${BRAND.navy}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${size}" height="${size}">` +
    `<title>CyberNet Training</title>${background}` +
    `<g fill="none" stroke="${color}" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${SHIELD_PATH}"/>${connectors}</g>` +
    `<g fill="${color}"><circle cx="${HUB.x}" cy="${HUB.y}" r="${HUB.r}"/>${nodes}</g>` +
    `</svg>`
  );
}
