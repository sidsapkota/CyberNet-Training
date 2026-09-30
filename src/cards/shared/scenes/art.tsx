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

function Chips({ x, y, count, w, h, gap }: { x: number; y: number; count: number; w: number; h: number; gap: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x + i * (w + gap)} y={y} width={w} height={h} rx={1} fill={C.shell} />
      ))}
    </>
  );
}

/* ── Laptop (underside) ───────────────────────────────────────────────────────────────── */

const LAPTOP: Record<string, ReactNode> = {
  motherboard: (
    <g>
      <rect x={32} y={32} width={160} height={156} rx={6} fill={C.board} stroke={C.edge} strokeWidth={0.8} />
      <path d="M40 150H70L82 138H110M40 166H96L108 154H150M100 44V36M150 176H180" stroke={C.line} strokeWidth={1.5} fill="none" />
    </g>
  ),
  cpu: (
    <g>
      <path d="M70 66H118" stroke={C.edge} strokeWidth={5} strokeLinecap="round" />
      <rect x={52} y={48} width={36} height={36} rx={3} fill={C.part} stroke={C.muted} strokeWidth={1} />
      <rect x={60} y={56} width={20} height={20} rx={2} fill={C.panel} stroke={C.edge} strokeWidth={0.8} />
    </g>
  ),
  fan: (
    <g>
      <circle cx={140} cy={66} r={24} fill={C.part} stroke={C.edge} strokeWidth={1} />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M140 66Q150 52 142 44" stroke={C.muted} strokeWidth={3} strokeLinecap="round" fill="none" transform={`rotate(${a} 140 66)`} />
      ))}
      <circle cx={140} cy={66} r={6} fill={C.shell} stroke={C.edge} />
    </g>
  ),
  ram: (
    <g>
      <rect x={44} y={108} width={72} height={20} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <Chips x={49} y={112} count={4} w={12} h={12} gap={4} />
    </g>
  ),
  storage: (
    <g>
      <rect x={124} y={112} width={56} height={18} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <Chips x={130} y={116} count={2} w={14} h={10} gap={6} />
      <circle cx={174} cy={121} r={2} fill={C.shell} />
    </g>
  ),
  battery: (
    <g>
      <rect x={204} y={36} width={84} height={148} rx={6} fill={C.panel} stroke={C.edge} strokeWidth={1} />
      <path d="M212 85H280M212 135H280" stroke={C.line} strokeWidth={1.5} />
      <path d="M246 56V70M239 63H253" stroke={C.muted} strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  "battery-connector": (
    <g>
      <rect x={186} y={100} width={22} height={14} rx={2} fill={C.muted} />
      <path d="M190 104H204M190 110H204" stroke={C.shell} strokeWidth={1.2} />
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
      <path d="M80 100H110L118 92H150M36 96H70" stroke={C.line} strokeWidth={1.5} fill="none" />
    </g>
  ),
  camera: (
    <g>
      <circle cx={56} cy={46} r={14} fill={C.part} stroke={C.edge} strokeWidth={1} />
      <circle cx={56} cy={46} r={7} fill={C.bg} stroke={C.muted} strokeWidth={1.2} />
    </g>
  ),
  cpu: (
    <g>
      <rect x={88} y={32} width={30} height={30} rx={3} fill={C.part} stroke={C.muted} strokeWidth={1} />
      <rect x={95} y={39} width={16} height={16} rx={2} fill={C.panel} stroke={C.edge} strokeWidth={0.8} />
    </g>
  ),
  ram: <rect x={126} y={34} width={26} height={22} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />,
  storage: (
    <g>
      <rect x={126} y={70} width={30} height={22} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <rect x={132} y={76} width={18} height={10} rx={1} fill={C.shell} />
    </g>
  ),
  battery: (
    <g>
      <rect x={36} y={128} width={128} height={140} rx={10} fill={C.panel} stroke={C.edge} strokeWidth={1} />
      <path d="M100 176V194M91 185H109" stroke={C.muted} strokeWidth={2.4} strokeLinecap="round" />
      <rect x={88} y={262} width={24} height={10} rx={2} fill={C.edge} opacity={0.8} />
    </g>
  ),
  "battery-connector": (
    <g>
      <path d="M100 122V128" stroke={C.muted} strokeWidth={4} />
      <rect x={88} y={108} width={24} height={14} rx={2} fill={C.muted} />
      <path d="M92 112H108M92 118H108" stroke={C.shell} strokeWidth={1.2} />
    </g>
  ),
  speaker: (
    <g>
      <rect x={34} y={286} width={30} height={12} rx={3} fill={C.part} />
      {[40, 46, 52, 58].map((x) => (
        <circle key={x} cx={x} cy={292} r={1.4} fill={C.shell} />
      ))}
    </g>
  ),
  "charging-port": (
    <g>
      {/* On the bottom edge, so it's visible with the cover on. */}
      <rect x={80} y={305} width={40} height={8} rx={4} fill={C.bg} stroke={C.edge} strokeWidth={1.2} />
      <path d="M88 309H112" stroke={C.muted} strokeWidth={1.5} strokeLinecap="round" />
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
