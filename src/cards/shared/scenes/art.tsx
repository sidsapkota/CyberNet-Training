import type { ReactNode } from "react";
import { getScene, type SceneId } from "./manifests";

/*
 * Scene drawings, one per manifest in manifests.ts. Each part is its own group so cards can hide,
 * animate or highlight parts individually. Drawn for the always-navy screen panel with the fixed
 * --color-scene-* tokens. Generic shapes only: no brands, logos or real product designs.
 */

const C = {
  bg: "var(--color-screen)",
  shell: "var(--color-scene-shell)",
  panel: "var(--color-scene-panel)",
  board: "var(--color-scene-board)",
  part: "var(--color-scene-part)",
  edge: "var(--color-scene-edge)",
  line: "var(--color-screen-line)",
  ink: "var(--color-on-screen)",
  muted: "var(--color-on-screen-muted)",
  warn: "var(--color-screen-danger)",
  contact: "var(--color-scene-contact)",
};

const mono = "var(--font-plex-mono), ui-monospace, monospace";
const sans = "var(--font-plex-sans), ui-sans-serif, sans-serif";

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill={C.edge} stroke={C.shell} strokeWidth={1.5} />
      <path d={`M${x - 3} ${y}H${x + 3}M${x} ${y - 3}V${y + 3}`} stroke={C.shell} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

/*
 * Each kind of part has its own recurring look, the same in every scene, so learners can tell
 * them apart (and a phone's parts look like a laptop's):
 * - CPU: a square package under a shiny metal lid, a pin-1 mark and contact dots round the edge
 * - RAM: a small board carrying a row of identical chips, with gold contacts along one side
 * - Storage: a chip marked with stacked layers (where saved things pile up)
 * - Battery: fat cells (or one pouch) with a lightning bolt and a gold terminal
 * - Fan: blades in a round housing, with exhaust slots
 */

/** A row of small identical chips (RAM). */
function Chips({ x, y, count, w, h, gap }: { x: number; y: number; count: number; w: number; h: number; gap: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <g key={i}>
          <rect x={x + i * (w + gap)} y={y} width={w} height={h} rx={1} fill={C.shell} />
          <rect x={x + i * (w + gap) + 1.5} y={y + 1.5} width={2} height={2} rx={0.5} fill={C.muted} opacity={0.6} />
        </g>
      ))}
    </>
  );
}

/** Gold contact fingers along an edge: vertical ticks between x0 and x1, with an optional notch. */
function Fingers({ x0, x1, y, h, notch }: { x0: number; x1: number; y: number; h: number; notch?: number }) {
  const ticks: number[] = [];
  for (let x = x0; x <= x1; x += 3) if (notch === undefined || Math.abs(x - notch) > 2.5) ticks.push(x);
  return <path d={ticks.map((x) => `M${x} ${y}V${y + h}`).join("")} stroke={C.contact} strokeWidth={1.5} />;
}

/** A processor: package, contact dots, a metal heat spreader with a sheen, and a pin-1 mark. */
function CpuPackage({ x, y, size }: { x: number; y: number; size: number }) {
  const inset = size * 0.2;
  const dots: string[] = [];
  for (let i = 1; i < 6; i++) {
    const t = x + (size * i) / 6;
    const u = y + (size * i) / 6;
    dots.push(`M${t} ${y + 2}h0.01M${t} ${y + size - 2}h0.01M${x + 2} ${u}h0.01M${x + size - 2} ${u}h0.01`);
  }
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={3} fill={C.part} stroke={C.muted} strokeWidth={1} />
      <path d={dots.join("")} stroke={C.contact} strokeWidth={2} strokeLinecap="round" />
      <rect x={x + inset} y={y + inset} width={size - 2 * inset} height={size - 2 * inset} rx={2.5} fill={C.edge} />
      <path
        d={`M${x + inset + 3} ${y + size - inset - 3}L${x + size - inset - 3} ${y + inset + 3}`}
        stroke={C.ink}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.35}
      />
      <path d={`M${x + 3} ${y + 3}h5l-5 5Z`} fill={C.contact} />
    </g>
  );
}

/** A storage (flash) chip: stacked layers, like saved things piled up. */
function StorageChip({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const rows = 3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill={C.shell} />
      {Array.from({ length: rows }, (_, i) => {
        const ly = y + (h * (i + 1)) / (rows + 1);
        return <path key={i} d={`M${x + 3 + i} ${ly}H${x + w - 3 - i}`} stroke={C.muted} strokeWidth={1.4} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** A lightning bolt (energy), centred on (cx, cy), `s` units tall. */
function Bolt({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  const k = s / 28;
  const points = (
    [
      [3, -14],
      [-7, 2],
      [0, 2],
      [-3, 14],
      [7, -2],
      [0, -2],
    ] as const
  )
    .map(([dx, dy]) => `${cx + dx * k},${cy + dy * k}`)
    .join(" ");
  return <polygon points={points} fill={C.muted} />;
}

/* ── Laptop (underside) ───────────────────────────────────────────────────────────────── */

const LAPTOP: Record<string, ReactNode> = {
  motherboard: (
    <g>
      <rect x={32} y={32} width={160} height={156} rx={6} fill={C.board} stroke={C.edge} strokeWidth={0.8} />
      <path d="M40 150H70L82 138H110M40 166H96L108 154H150M100 44V36M150 176H180M40 142H60" stroke={C.line} strokeWidth={1.5} fill="none" />
      {/* Small components and mounting holes: the board everything plugs into. */}
      {[
        [60, 176],
        [72, 176],
        [128, 164],
        [138, 164],
        [170, 150],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={6} height={4} rx={0.8} fill={C.shell} />
      ))}
      {[
        [40, 180],
        [184, 180],
        [184, 40],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2} fill={C.bg} stroke={C.contact} strokeWidth={1.2} />
      ))}
    </g>
  ),
  cpu: (
    <g>
      {/* Copper heat pipe carrying heat to the fan. */}
      <path d="M82 62H112" stroke={C.contact} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
      <CpuPackage x={52} y={48} size={36} />
    </g>
  ),
  fan: (
    <g>
      <rect x={116} y={42} width={48} height={48} rx={10} fill={C.shell} stroke={C.edge} strokeWidth={1} />
      <path d="M124 45H156" stroke={C.bg} strokeWidth={2.5} strokeDasharray="3 2.5" />
      <circle cx={140} cy={67} r={20} fill={C.part} stroke={C.edge} strokeWidth={1} />
      {[0, 51.4, 102.8, 154.3, 205.7, 257.1, 308.6].map((a) => (
        <path
          key={a}
          d="M140 67C146 61 147 54 143 49L139 50C141 55 139 61 140 67Z"
          fill={C.muted}
          opacity={0.85}
          transform={`rotate(${a} 140 67)`}
        />
      ))}
      <circle cx={140} cy={67} r={5.5} fill={C.shell} stroke={C.edge} />
    </g>
  ),
  ram: (
    <g>
      <rect x={44} y={107} width={72} height={22} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <Chips x={48} y={110} count={4} w={13} h={10} gap={4} />
      <Fingers x0={47} x1={113} y={124} h={4} notch={78} />
      {/* Side notches where the clips hold the stick. */}
      <circle cx={44} cy={118} r={2.5} fill={C.bg} />
      <circle cx={116} cy={118} r={2.5} fill={C.bg} />
    </g>
  ),
  storage: (
    <g>
      <rect x={122} y={111} width={60} height={20} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      {/* Contacts on the short end (RAM has them along the long side). */}
      <path d="M123 114H127M123 117H127M123 120H127M123 125H127M123 128H127" stroke={C.contact} strokeWidth={1.4} />
      <rect x={131} y={115} width={9} height={12} rx={1} fill={C.shell} />
      <StorageChip x={144} y={114} w={26} h={14} />
      <circle cx={178} cy={121} r={2.6} fill={C.bg} stroke={C.edge} strokeWidth={1} />
    </g>
  ),
  battery: (
    <g>
      <rect x={204} y={36} width={84} height={148} rx={6} fill={C.panel} stroke={C.edge} strokeWidth={1} />
      {[42, 90, 138].map((y) => (
        <g key={y}>
          <rect x={210} y={y} width={68} height={42} rx={10} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
          <rect x={278} y={y + 15} width={4} height={12} rx={1.5} fill={C.contact} />
        </g>
      ))}
      <Bolt cx={244} cy={111} s={26} />
    </g>
  ),
  "battery-connector": (
    <g>
      <path d="M204 104H200M204 110H200" stroke={C.contact} strokeWidth={1.6} />
      <rect x={186} y={100} width={16} height={14} rx={2} fill={C.muted} />
      <path d="M189 104H199M189 110H199" stroke={C.shell} strokeWidth={1.2} />
    </g>
  ),
  panel: (
    <g>
      <rect x={24} y={24} width={272} height={172} rx={10} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={112 + i * 14} y={50} width={6} height={36} rx={3} fill={C.shell} />
      ))}
      {[
        [50, 170],
        [270, 170],
        [50, 52],
        [270, 52],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x! - 10} y={y! - 3} width={20} height={6} rx={3} fill={C.shell} opacity={0.7} />
      ))}
    </g>
  ),
  "screw-1": <Screw x={40} y={40} />,
  "screw-2": <Screw x={280} y={40} />,
  "screw-3": <Screw x={40} y={180} />,
  "screw-4": <Screw x={280} y={180} />,
};

function LaptopBase() {
  return (
    <>
      <rect x={16} y={16} width={288} height={188} rx={14} fill={C.shell} stroke={C.edge} strokeWidth={2} />
      <rect x={24} y={24} width={272} height={172} rx={10} fill={C.bg} />
    </>
  );
}

/* ── Phone (back) ─────────────────────────────────────────────────────────────────────── */

const PHONE: Record<string, ReactNode> = {
  "logic-board": (
    <g>
      <rect x={30} y={20} width={140} height={92} rx={8} fill={C.board} stroke={C.edge} strokeWidth={0.8} />
      <path d="M80 100H110L118 92H150M36 96H70M162 30V60" stroke={C.line} strokeWidth={1.5} fill="none" />
      {[
        [40, 72],
        [48, 72],
        [40, 80],
        [66, 100],
        [158, 100],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={5} height={3.5} rx={0.8} fill={C.shell} />
      ))}
    </g>
  ),
  camera: (
    <g>
      <rect x={40} y={30} width={32} height={32} rx={7} fill={C.part} stroke={C.edge} strokeWidth={1} />
      <circle cx={56} cy={46} r={11} fill={C.shell} stroke={C.edge} strokeWidth={1.2} />
      <circle cx={56} cy={46} r={6.5} fill={C.bg} stroke={C.muted} strokeWidth={1} />
      <circle cx={53.5} cy={43.5} r={1.8} fill={C.ink} opacity={0.6} />
      <path d="M72 56H80" stroke={C.contact} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
    </g>
  ),
  cpu: <CpuPackage x={88} y={32} size={30} />,
  ram: (
    <g>
      <rect x={125} y={33} width={28} height={24} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <Chips x={128} y={36} count={2} w={10} h={12} gap={2} />
      <Fingers x0={128} x1={150} y={51} h={3.5} />
    </g>
  ),
  storage: (
    <g>
      <rect x={125} y={69} width={32} height={24} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <StorageChip x={129} y={73} w={24} h={16} />
    </g>
  ),
  battery: (
    <g>
      <rect x={36} y={128} width={128} height={140} rx={10} fill={C.panel} stroke={C.edge} strokeWidth={1} />
      <rect x={44} y={138} width={112} height={120} rx={8} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <rect x={92} y={129} width={16} height={5} rx={1.5} fill={C.contact} />
      <Bolt cx={100} cy={198} s={40} />
      <rect x={88} y={262} width={24} height={10} rx={2} fill={C.edge} opacity={0.8} />
    </g>
  ),
  "battery-connector": (
    <g>
      <path d="M100 122V129" stroke={C.contact} strokeWidth={4} />
      <rect x={88} y={108} width={24} height={14} rx={2} fill={C.muted} />
      <path d="M92 112H108M92 118H108" stroke={C.shell} strokeWidth={1.2} />
    </g>
  ),
  speaker: (
    <g>
      <rect x={34} y={284} width={30} height={16} rx={4} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      {[40, 46, 52, 58].flatMap((x) => [289, 295].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} fill={C.shell} />))}
    </g>
  ),
  "charging-port": (
    <g>
      {/* On the bottom edge, so it's visible with the cover on. */}
      <rect x={80} y={305} width={40} height={8} rx={4} fill={C.bg} stroke={C.edge} strokeWidth={1.2} />
      <path d="M88 309H112" stroke={C.contact} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  ),
  "back-cover": (
    <g>
      <rect x={26} y={14} width={148} height={292} rx={22} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      <rect x={36} y={26} width={44} height={52} rx={12} fill={C.shell} stroke={C.edge} />
      <circle cx={58} cy={42} r={7} fill={C.bg} stroke={C.muted} />
      <circle cx={58} cy={62} r={7} fill={C.bg} stroke={C.muted} />
    </g>
  ),
  "screw-1": <Screw x={44} y={296} />,
  "screw-2": <Screw x={156} y={296} />,
};

function PhoneBase() {
  return (
    <>
      <rect x={20} y={8} width={160} height={304} rx={26} fill={C.shell} stroke={C.edge} strokeWidth={2} />
      <rect x={26} y={14} width={148} height={292} rx={22} fill={C.bg} />
    </>
  );
}

/* ── File browser ─────────────────────────────────────────────────────────────────────── */

function FolderRow({ y, name }: { y: number; name: string }) {
  return (
    <g>
      <path d={`M18 ${y + 5}H25L27 ${y + 7}H34V${y + 16}H18Z`} fill={C.edge} />
      <text x={40} y={y + 15} fontSize={9.5} fill={C.ink} fontFamily={sans}>
        {name}
      </text>
    </g>
  );
}

type FileIcon = "image" | "music" | "doc" | "text";
function FileRow({ y, name, icon }: { y: number; name: string; icon: FileIcon }) {
  const iconNode = {
    image: (
      <g>
        <rect x={104} y={y + 5} width={16} height={16} rx={2} fill={C.part} stroke={C.edge} />
        <path d={`M106 ${y + 18}L111 ${y + 12}L114 ${y + 15}L116 ${y + 13}L118 ${y + 18}Z`} fill={C.muted} />
        <circle cx={115} cy={y + 9} r={1.6} fill={C.muted} />
      </g>
    ),
    music: (
      <g>
        <rect x={104} y={y + 5} width={16} height={16} rx={2} fill={C.part} stroke={C.edge} />
        <path d={`M110 ${y + 17}V${y + 9}L116 ${y + 8}V${y + 15}`} stroke={C.muted} strokeWidth={1.4} fill="none" />
      </g>
    ),
    doc: (
      <g>
        <path d={`M106 ${y + 4}H115L119 ${y + 8}V${y + 22}H106Z`} fill={C.part} stroke={C.edge} />
        <path d={`M109 ${y + 12}H116M109 ${y + 15}H116M109 ${y + 18}H114`} stroke={C.muted} strokeWidth={1} />
      </g>
    ),
    text: (
      <g>
        <path d={`M106 ${y + 4}H115L119 ${y + 8}V${y + 22}H106Z`} fill={C.part} stroke={C.edge} />
        <path d={`M109 ${y + 12}H116M109 ${y + 15}H116`} stroke={C.muted} strokeWidth={1} />
      </g>
    ),
  }[icon];
  return (
    <g>
      <rect x={98} y={y + 1} width={208} height={24} rx={4} fill={C.shell} opacity={0.5} />
      {iconNode}
      <text x={128} y={y + 17} fontSize={10.5} fill={C.ink} fontFamily={mono}>
        {name}
      </text>
    </g>
  );
}

const FILES: Record<string, ReactNode> = {
  "folder-documents": <FolderRow y={38} name="Documents" />,
  "folder-photos": <FolderRow y={62} name="Photos" />,
  "folder-music": <FolderRow y={86} name="Music" />,
  "folder-downloads": <FolderRow y={110} name="Downloads" />,
  "file-holiday": <FileRow y={36} name="holiday.jpg" icon="image" />,
  "file-song": <FileRow y={64} name="song.mp3" icon="music" />,
  "file-essay": <FileRow y={92} name="essay.docx" icon="doc" />,
  // Deliberately looks like a photo: the name gives it away.
  "file-fake-photo": <FileRow y={120} name="photo.jpg.exe" icon="image" />,
  "file-notes": <FileRow y={148} name="notes.txt" icon="text" />,
};

function FileBrowserBase() {
  return (
    <>
      <rect x={8} y={8} width={304} height={184} rx={8} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      <path d="M8 30V16A8 8 0 0 1 16 8H304A8 8 0 0 1 312 16V30Z" fill={C.shell} />
      {[20, 30, 40].map((x) => (
        <circle key={x} cx={x} cy={19} r={3} fill={C.edge} />
      ))}
      <path d="M92 30V192" stroke={C.edge} strokeWidth={1} opacity={0.6} />
    </>
  );
}

/* ── Registry ─────────────────────────────────────────────────────────────────────────── */

const ART: Record<SceneId, { Base: () => ReactNode; parts: Record<string, ReactNode> }> = {
  laptop: { Base: LaptopBase, parts: LAPTOP },
  phone: { Base: PhoneBase, parts: PHONE },
  "file-browser": { Base: FileBrowserBase, parts: FILES },
};

export function sceneHasArt(id: string, partIds: readonly string[]): boolean {
  const art = (ART as Record<string, { parts: Record<string, ReactNode> }>)[id];
  return Boolean(art && partIds.every((p) => p in art.parts));
}

/**
 * Draws a scene. `hidden` parts aren't drawn. `wrap` lets a card add motion or highlights around
 * each part (teardown animates parts out; hotspot leaves them still).
 */
export function SceneArt({
  sceneId,
  hidden,
  wrap = (_id, node) => node,
  title,
}: {
  sceneId: SceneId;
  hidden: ReadonlySet<string>;
  wrap?: (partId: string, node: ReactNode) => ReactNode;
  title?: string;
}) {
  const scene = getScene(sceneId)!;
  const art = ART[sceneId];
  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className="block size-full overflow-visible"
      role="img"
      aria-label={title ?? scene.description}
    >
      <art.Base />
      {scene.parts.map((part) =>
        hidden.has(part.id) ? null : <g key={part.id}>{wrap(part.id, art.parts[part.id])}</g>,
      )}
    </svg>
  );
}
