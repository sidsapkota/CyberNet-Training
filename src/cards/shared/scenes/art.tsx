import type { ReactNode } from "react";
import { getScene, type SceneId } from "./manifests";
import {
  type El,
  EMAIL_FROZEN_SCENE,
  EMAIL_PAYMENT_SCENE,
  EMAIL_SCENE,
  FAKE_WEBSITE_SCENE,
  PHONE_CALL_SCENE,
  TEXT_MESSAGE_SCENE,
  TEXT_TOLLS_SCENE,
  type TextScene,
  type Tone,
} from "./textScenes";

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
  ok: "var(--color-screen-success)",
  screenSky: "var(--color-pic-sky-day)",
};

const mono = "var(--font-plex-mono), ui-monospace, monospace";
const sans = "var(--font-plex-sans), ui-sans-serif, sans-serif";

function Screw({ x, y, small = false }: { x: number; y: number; small?: boolean }) {
  const r = small ? 4 : 6;
  const k = small ? 2 : 3;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={C.edge} stroke={C.shell} strokeWidth={1.5} />
      <path d={`M${x - k} ${y}H${x + k}M${x} ${y - k}V${y + k}`} stroke={C.shell} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

/*
 * Simplified diagrams, not photos (each shows a "Simplified diagram" label). Layouts follow real
 * devices: a laptop's battery runs across the bottom, a heat pipe carries the CPU's heat to the
 * fan; a phone's battery fills most of its body. Each kind of part keeps one recognisable look:
 * - CPU: a small shiny chip (the die) on a square green base. Laptop and phone processors have no
 *   metal lid; a laptop's is normally hidden under the heat pipe's copper plate.
 * - RAM: in the laptop, a stick in a slot with a row of chips and gold contacts along its long
 *   side (removable in this example). In the phone, one small chip soldered to the board.
 * - Storage: chips marked with stacked layers. In the laptop they sit on a long, narrow SSD card
 *   with contacts on its short end; in the phone, one soldered chip.
 * - Battery: flat cells (or one pouch) with a lightning bolt and a gold terminal.
 * - Fan: blades in a round housing; the heat pipe is a copper tube ending in metal fins.
 * The lightning bolt and stacked layers are teaching marks, not real markings.
 */

/** A row of small identical chips (RAM stick). */
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

/** A processor as it really looks: a small shiny die on a square base, with tiny parts around it. */
function Processor({ x, y, size }: { x: number; y: number; size: number }) {
  const die = size * 0.46;
  const d0x = x + (size - die) / 2;
  const d0y = y + (size - die) / 2;
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={3} fill={C.board} stroke={C.muted} strokeWidth={1} />
      <rect x={d0x} y={d0y} width={die} height={die} rx={1.5} fill={C.edge} />
      <path d={`M${d0x + 2} ${d0y + die - 2}L${d0x + die - 2} ${d0y + 2}`} stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.35} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + 3 + i * 4} y={y + size - 6} width={2.5} height={3} rx={0.5} fill={C.contact} opacity={0.8} />
      ))}
      <path d={`M${x + 3} ${y + 3}h4l-4 4Z`} fill={C.contact} />
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

/* ── Laptop (underside): an example with a removable RAM stick and an SSD ──────────────── */

const LAPTOP: Record<string, ReactNode> = {
  motherboard: (
    <g>
      <rect x={32} y={30} width={256} height={86} rx={6} fill={C.board} stroke={C.edge} strokeWidth={0.8} />
      <path d="M100 100H140L148 92H168M104 76H116M160 60H186M60 110H140" stroke={C.line} strokeWidth={1.5} fill="none" />
      {[
        [108, 100],
        [118, 100],
        [160, 66],
        [168, 66],
        [102, 88],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={6} height={4} rx={0.8} fill={C.shell} />
      ))}
      {[
        [38, 110],
        [282, 110],
        [160, 36],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill={C.bg} stroke={C.contact} strokeWidth={1.2} />
      ))}
    </g>
  ),
  "heat-pipe": (
    <g>
      {/* Metal fins at the vent: the fan blows air through them. */}
      <rect x={30} y={31} width={14} height={16} rx={1.5} fill={C.shell} />
      <path d="M33 32V46M36 32V46M39 32V46M42 32V46" stroke={C.muted} strokeWidth={1} />
      {/* The copper heat pipe, from the CPU to the fins. */}
      <path d="M44 39H100Q108 39 108 47V64Q108 70 114 70H122" fill="none" stroke={C.contact} strokeWidth={5} strokeLinecap="round" />
    </g>
  ),
  fan: (
    <g>
      <rect x={44} y={54} width={50} height={50} rx={10} fill={C.shell} stroke={C.edge} strokeWidth={1} />
      <circle cx={69} cy={79} r={20} fill={C.part} stroke={C.edge} strokeWidth={1} />
      {[0, 51.4, 102.8, 154.3, 205.7, 257.1, 308.6].map((a) => (
        <path key={a} d="M69 79C75 73 76 66 72 61L68 62C70 67 68 73 69 79Z" fill={C.muted} opacity={0.85} transform={`rotate(${a} 69 79)`} />
      ))}
      <circle cx={69} cy={79} r={5} fill={C.shell} stroke={C.edge} />
    </g>
  ),
  cpu: <Processor x={120} y={54} size={32} />,
  ram: (
    <g>
      {/* Slot latches at each end: this stick can be unclipped and swapped. */}
      <rect x={190} y={46} width={4} height={14} rx={1} fill={C.edge} />
      <rect x={278} y={46} width={4} height={14} rx={1} fill={C.edge} />
      <rect x={194} y={36} width={84} height={34} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <Chips x={199} y={40} count={4} w={15} h={13} gap={5} />
      <Fingers x0={197} x1={275} y={63} h={5} notch={236} />
    </g>
  ),
  storage: (
    <g>
      {/* A long, narrow SSD card: contacts on its short end, held by one screw at the other. */}
      <rect x={174} y={84} width={108} height={20} rx={2} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <path d="M175 87H179M175 90H179M175 93H179M175 97H179M175 100H179" stroke={C.contact} strokeWidth={1.4} />
      <rect x={184} y={88} width={12} height={12} rx={1} fill={C.shell} />
      <StorageChip x={202} y={87} w={30} h={14} />
      <StorageChip x={238} y={87} w={30} h={14} />
      <circle cx={278} cy={94} r={3} fill={C.bg} stroke={C.edge} strokeWidth={1} />
    </g>
  ),
  battery: (
    <g>
      <rect x={40} y={126} width={240} height={60} rx={6} fill={C.panel} stroke={C.edge} strokeWidth={1} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={46 + i * 58} y={131} width={54} height={50} rx={6} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      ))}
      <rect x={153} y={122} width={14} height={5} rx={1.5} fill={C.contact} />
      <Bolt cx={160} cy={156} s={26} />
    </g>
  ),
  "battery-connector": (
    <g>
      <path d="M160 118V124" stroke={C.contact} strokeWidth={3} />
      <rect x={150} y={108} width={20} height={11} rx={2} fill={C.muted} />
      <path d="M153 111H167M153 115H167" stroke={C.shell} strokeWidth={1.2} />
    </g>
  ),
  panel: (
    <g>
      <rect x={24} y={24} width={272} height={172} rx={10} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={50 + i * 8} y={60} width={4} height={38} rx={2} fill={C.shell} />
      ))}
      {[
        [60, 176],
        [260, 176],
        [60, 46],
        [260, 46],
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

/* ── Phone (back): glued shut; the battery fills most of it ───────────────────────────── */

const PHONE: Record<string, ReactNode> = {
  "logic-board": (
    <g>
      <rect x={30} y={18} width={140} height={94} rx={8} fill={C.board} stroke={C.edge} strokeWidth={0.8} />
      <path d="M40 76H70L78 84M124 96H160M40 104H74" stroke={C.line} strokeWidth={1.5} fill="none" />
      {[
        [40, 70],
        [48, 70],
        [40, 86],
        [140, 100],
        [150, 100],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={5} height={3.5} rx={0.8} fill={C.shell} />
      ))}
    </g>
  ),
  camera: (
    <g>
      <rect x={36} y={26} width={38} height={38} rx={8} fill={C.part} stroke={C.edge} strokeWidth={1} />
      <circle cx={55} cy={45} r={12} fill={C.shell} stroke={C.edge} strokeWidth={1.2} />
      <circle cx={55} cy={45} r={7} fill={C.bg} stroke={C.muted} strokeWidth={1} />
      <circle cx={52.5} cy={42.5} r={1.8} fill={C.ink} opacity={0.6} />
      {/* Its own little cable, pressed onto a connector on the board. */}
      <path d="M74 58H82" stroke={C.contact} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
    </g>
  ),
  cpu: <Processor x={84} y={28} size={34} />,
  ram: (
    <g>
      {/* One small RAM chip, soldered on (in many phones it's stacked on the processor instead). */}
      <rect x={128} y={28} width={32} height={26} rx={2} fill={C.shell} stroke={C.edge} strokeWidth={0.8} />
      {[0, 1].flatMap((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}-${c}`} x={133 + c * 8.5} y={33 + r * 8.5} width={6} height={6} rx={1} fill={C.part} />),
      )}
    </g>
  ),
  storage: <StorageChip x={128} y={62} w={32} h={26} />,
  "battery-connector": (
    <g>
      <rect x={90} y={100} width={24} height={11} rx={2} fill={C.muted} />
      <path d="M93 103H111M93 107H111" stroke={C.shell} strokeWidth={1.2} />
      <path d="M102 111V120" stroke={C.contact} strokeWidth={4} />
    </g>
  ),
  "connector-cover": (
    <g>
      {/* A small metal bracket, screwed down, that stops the connector popping off. */}
      <rect x={74} y={85} width={56} height={11} rx={3} fill={C.edge} stroke={C.muted} strokeWidth={0.8} />
      <path d="M92 90.5H112" stroke={C.shell} strokeWidth={1.2} opacity={0.6} />
    </g>
  ),
  battery: (
    <g>
      <rect x={38} y={120} width={108} height={154} rx={10} fill={C.panel} stroke={C.edge} strokeWidth={1} />
      <rect x={44} y={126} width={96} height={142} rx={8} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      <rect x={96} y={118} width={12} height={4} rx={1.5} fill={C.contact} />
      <Bolt cx={92} cy={197} s={40} />
    </g>
  ),
  "flex-cable": (
    <g>
      {/* A flat ribbon cable joining the main board to the small board at the bottom. */}
      <rect x={154} y={114} width={12} height={164} rx={3} fill={C.part} stroke={C.contact} strokeWidth={1} opacity={0.9} />
      <path d="M158 118V274M162 118V274" stroke={C.contact} strokeWidth={0.8} opacity={0.6} />
    </g>
  ),
  speaker: (
    <g>
      <rect x={36} y={284} width={36} height={12} rx={3} fill={C.part} stroke={C.edge} strokeWidth={0.8} />
      {[42, 48, 54, 60, 66].map((x) => (
        <circle key={x} cx={x} cy={290} r={1.4} fill={C.shell} />
      ))}
    </g>
  ),
  "vibration-motor": (
    <g>
      <rect x={82} y={284} width={24} height={12} rx={6} fill={C.edge} stroke={C.muted} strokeWidth={0.8} />
      <path d="M100 286A4 4 0 0 1 100 294Z" fill={C.shell} />
    </g>
  ),
  "charging-port": (
    <g>
      {/* On the bottom edge, so it's visible with the cover on. */}
      <rect x={76} y={302} width={48} height={12} rx={6} fill={C.bg} stroke={C.edge} strokeWidth={1.5} />
      <path d="M86 308H114" stroke={C.contact} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  ),
  "back-cover": (
    <g>
      <rect x={26} y={14} width={148} height={292} rx={22} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      {/* The glue line just inside the edge: the back is glued on, not screwed. */}
      <rect x={31} y={19} width={138} height={282} rx={18} fill="none" stroke={C.edge} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.6} />
      <rect x={36} y={26} width={44} height={52} rx={12} fill={C.shell} stroke={C.edge} />
      <circle cx={58} cy={42} r={7} fill={C.bg} stroke={C.muted} />
      <circle cx={58} cy={62} r={7} fill={C.bg} stroke={C.muted} />
    </g>
  ),
  "screw-1": <Screw x={80} y={90} small />,
  "screw-2": <Screw x={124} y={90} small />,
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

/* ── Scam-spotting scenes: drawn from the data in textScenes.ts (all fictional, .example only) ── */

const TONE: Record<Tone, string> = {
  ink: C.ink,
  muted: C.muted,
  warn: C.warn,
  good: "var(--color-screen-success)",
  bg: C.bg,
  edge: C.edge,
  panel: C.panel,
  shell: C.shell,
  part: C.part,
  none: "none",
};

function drawEl(el: El, key: number): ReactNode {
  switch (el.t) {
    case "text":
      return (
        <text
          key={key}
          x={el.x}
          y={el.y}
          fontSize={el.s}
          fontWeight={el.w ?? 400}
          fill={TONE[el.tone ?? "ink"]}
          fontFamily={el.mono ? mono : sans}
          textAnchor={el.anchor ?? "start"}
          textDecoration={el.underline ? "underline" : undefined}
        >
          {el.text}
        </text>
      );
    case "rect":
      return (
        <rect
          key={key}
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          rx={el.r ?? 0}
          fill={TONE[el.fill ?? "none"]}
          stroke={el.stroke ? TONE[el.stroke] : undefined}
          strokeWidth={el.sw}
          strokeDasharray={el.dash}
        />
      );
    case "circle":
      return <circle key={key} cx={el.cx} cy={el.cy} r={el.r} fill={TONE[el.fill ?? "none"]} stroke={el.stroke ? TONE[el.stroke] : undefined} strokeWidth={el.sw} />;
    case "path":
      return (
        <path
          key={key}
          d={el.d}
          fill={TONE[el.fill ?? "none"]}
          stroke={el.stroke ? TONE[el.stroke] : undefined}
          strokeWidth={el.sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
  }
}

function textSceneArt(scene: TextScene): { Base: () => ReactNode; parts: Record<string, ReactNode> } {
  const Base = () => <>{scene.base.map(drawEl)}</>;
  return { Base, parts: Object.fromEntries(scene.parts.map((part) => [part.id, <g key={part.id}>{part.els.map(drawEl)}</g>])) };
}

/* ── Stay Safe Online module 1 (Lesson Blueprint): home screen, sign-in options, sign-in ── */
// Text here is 15–17 units in 320-wide scenes, so it reads at about 14px or more on a phone.

function Padlock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y + 7} width={16} height={12} rx={2.5} fill={C.ink} />
      <path d={`M${x + 3.5} ${y + 7}V${y + 4.5}A4.5 4.5 0 0 1 ${x + 12.5} ${y + 4.5}V${y + 7}`} fill="none" stroke={C.ink} strokeWidth={2} />
    </g>
  );
}

function AppIcon({ x, label, glyph }: { x: number; label: string; glyph: ReactNode }) {
  return (
    <g>
      <rect x={x + 7} y={62} width={56} height={56} rx={14} fill={C.part} stroke={C.edge} strokeWidth={1.5} />
      <g transform={`translate(${x + 35} 90)`}>{glyph}</g>
      <Padlock x={x + 4} y={50} />
      <text x={x + 35} y={146} fontSize={15} fontWeight={600} fill={C.ink} fontFamily={sans} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

const HOME: Record<string, ReactNode> = {
  "app-game-club": (
    <AppIcon
      x={14}
      label="Game Club"
      glyph={<path d="M-14 -6H14A6 6 0 0 1 14 8H-14A6 6 0 0 1 -14 -6ZM-8 -2V4M-11 1H-5" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />}
    />
  ),
  "app-email": (
    <AppIcon x={90} label="Email" glyph={<path d="M-14 -9H14V9H-14ZM-14 -9L0 2L14 -9" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />} />
  ),
  "app-music": (
    <AppIcon
      x={166}
      label="Music"
      glyph={<path d="M-4 8V-10L10 -13V5M-4 8A4 4 0 1 1 -4 7.9M10 5A4 4 0 1 1 10 4.9" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />}
    />
  ),
  "app-photos": (
    <AppIcon
      x={242}
      label="Photos"
      glyph={<path d="M-14 -10H14V10H-14ZM-14 6L-4 -2L4 5L8 1L14 6" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />}
    />
  ),
};

function HomeScreenBase() {
  return (
    <>
      <rect x={4} y={4} width={312} height={212} rx={22} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <text x={24} y={34} fontSize={15} fontWeight={600} fill={C.muted} fontFamily={sans}>9:41</text>
      <rect x={130} y={190} width={60} height={5} rx={2.5} fill={C.edge} />
    </>
  );
}

function OptionRow({ y, label, glyph }: { y: number; label: string; glyph: ReactNode }) {
  return (
    <g>
      <rect x={16} y={y} width={288} height={46} rx={10} fill={C.part} stroke={C.edge} strokeWidth={1.5} />
      <g transform={`translate(42 ${y + 23})`}>{glyph}</g>
      <text x={70} y={y + 29} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={sans}>
        {label}
      </text>
      <path d={`M286 ${y + 16}L293 ${y + 23}L286 ${y + 30}`} fill="none" stroke={C.muted} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

const OPTIONS: Record<string, ReactNode> = {
  "option-text-code": (
    <OptionRow
      y={64}
      label="Text me a code"
      glyph={<path d="M-11 -8H11V5H-2L-8 10V5H-11Z" fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />}
    />
  ),
  "option-authenticator": (
    <OptionRow
      y={120}
      label="Authenticator app"
      glyph={<path d="M-7 -11H7A2 2 0 0 1 9 -9V9A2 2 0 0 1 7 11H-7A2 2 0 0 1 -9 9V-9A2 2 0 0 1 -7 -11ZM-4 -2H4M-4 3H2" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />}
    />
  ),
  "option-passkey": (
    <OptionRow
      y={176}
      label="Passkey"
      glyph={<path d="M-10 -10H-5M5 -10H10V-5M10 5V10H5M-5 10H-10V5M-10 -5V-10M-3 -2V0M3 -2V0M-3 4A4 3 0 0 0 3 4" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />}
    />
  ),
};

function SignInOptionsBase() {
  return (
    <>
      <rect x={4} y={4} width={312} height={228} rx={18} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <text x={20} y={34} fontSize={17} fontWeight={600} fill={C.ink} fontFamily={sans}>Sign-in options</text>
      <text x={20} y={54} fontSize={15} fill={C.muted} fontFamily={sans}>Email</text>
    </>
  );
}

const SIGN_IN: Record<string, ReactNode> = {
  "sign-in-password": (
    <g>
      <text x={20} y={62} fontSize={15} fontWeight={600} fill={C.ink} fontFamily={sans}>Step 1: Password</text>
      <rect x={20} y={70} width={120} height={24} rx={5} fill={C.bg} stroke={C.edge} strokeWidth={1.2} />
      <text x={28} y={87} fontSize={16} fill={C.ink} fontFamily={mono}>••••••••</text>
      <rect x={148} y={70} width={52} height={24} rx={5} fill={C.edge} />
      <text x={174} y={87} fontSize={15} fontWeight={600} fill={C.ink} fontFamily={sans} textAnchor="middle">Next</text>
    </g>
  ),
  "sign-in-code-box": (
    <g>
      <text x={20} y={128} fontSize={15} fontWeight={600} fill={C.ink} fontFamily={sans}>Step 2: Enter the code</text>
      <rect x={20} y={136} width={120} height={24} rx={5} fill={C.bg} stroke={C.edge} strokeWidth={1.2} strokeDasharray="4 3" />
    </g>
  ),
  "sign-in-phone": (
    <g>
      <rect x={226} y={34} width={82} height={152} rx={14} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <rect x={232} y={58} width={70} height={74} rx={8} fill={C.part} stroke={C.edge} strokeWidth={1} />
      <text x={238} y={78} fontSize={15} fontWeight={600} fill={C.muted} fontFamily={sans}>Code</text>
      <text x={238} y={100} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={mono}>481</text>
      <text x={238} y={120} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={mono}>902</text>
    </g>
  ),
};

function SignInBase() {
  return (
    <>
      <rect x={6} y={14} width={208} height={168} rx={10} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <text x={20} y={38} fontSize={16} fontWeight={600} fill={C.muted} fontFamily={sans}>Email</text>
      <path d="M0 190H220" stroke={C.edge} strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

/* ── Stay Safe Online module 3 (Lesson Blueprint): a social post, and a café's Wi-Fi ────── */
// Real colours for the photo (fixed --color-pic-* tokens); text is 16+ units in 320-wide scenes.

const P = {
  wall: "var(--color-pic-wall)",
  brick: "var(--color-pic-stem)",
  leaf: "var(--color-pic-leaf)",
  board: "var(--color-scene-heat)",
  ground: "var(--color-scene-shell)",
};

const POST: Record<string, ReactNode> = {
  "post-letterbox": (
    <g>
      <rect x={42} y={146} width={10} height={54} fill={P.brick} />
      <rect x={24} y={110} width={46} height={38} rx={6} fill={C.part} stroke={C.ink} strokeWidth={2} />
      <rect x={32} y={118} width={30} height={5} rx={2} fill={C.shell} />
      <text x={47} y={142} fontSize={17} fontWeight={700} fill={C.ink} fontFamily={sans} textAnchor="middle">12</text>
    </g>
  ),
  "post-street-sign": (
    <g>
      <rect x={268} y={98} width={6} height={102} fill={C.edge} />
      <rect x={238} y={64} width={68} height={32} rx={4} fill={C.board} stroke={C.ink} strokeWidth={2} />
      <text x={272} y={86} fontSize={16} fontWeight={700} fill={C.ink} fontFamily={sans} textAnchor="middle">Fern St</text>
    </g>
  ),
  "post-sneakers": (
    <g>
      <path d="M114 166V158Q114 154 118 154H124L130 160H133Q135 160 135 163V166Z" fill={C.ink} stroke={C.shell} strokeWidth={1.2} />
      <path d="M128 168V160Q128 156 132 156H138L144 162H147Q149 162 149 165V168Z" fill={C.ink} stroke={C.shell} strokeWidth={1.2} />
      <path d="M114 166H135M128 168H149" stroke={C.edge} strokeWidth={2} />
    </g>
  ),
  "post-plant": (
    <g>
      <path d="M212 146Q200 128 198 116Q208 124 212 140Q214 120 222 112Q222 128 214 146Z" fill={P.leaf} />
      <path d="M212 146Q218 132 228 126Q226 138 216 148Z" fill={P.leaf} />
      <path d="M200 146H226L222 170H204Z" fill={P.brick} stroke={C.shell} strokeWidth={1.2} />
    </g>
  ),
  "post-skateboard": (
    <g>
      <rect x={58} y={206} width={56} height={8} rx={4} fill={P.board} stroke={C.shell} strokeWidth={1.2} />
      <circle cx={68} cy={218} r={4} fill={C.ink} />
      <circle cx={104} cy={218} r={4} fill={C.ink} />
    </g>
  ),
};

function SocialPostBase() {
  return (
    <>
      <rect x={4} y={4} width={312} height={232} rx={14} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      {/* The poster's picture: filled, so it never looks like a tap ring. */}
      <circle cx={24} cy={22} r={10} fill={C.edge} />
      <path d="M18 27Q24 18 30 27M24 21A3 3 0 1 0 24 15A3 3 0 1 0 24 21Z" fill={C.panel} />
      <text x={42} y={28} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={sans}>PixelFox</text>
      {/* The photo: a house front, its door and steps, and the footpath. */}
      <rect x={12} y={40} width={296} height={188} rx={6} fill={P.wall} />
      <path d="M12 200H308V222A6 6 0 0 1 302 228H18A6 6 0 0 1 12 222Z" fill={P.ground} />
      <rect x={128} y={60} width={56} height={92} rx={2} fill={C.part} stroke={C.shell} strokeWidth={2} />
      <circle cx={174} cy={108} r={3} fill={C.contact} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={110 - i * 8} y={152 + i * 16} width={92 + i * 16} height={16} fill={P.brick} stroke={C.shell} strokeWidth={1} />
          <path d={`M${134 - i * 4} ${152 + i * 16}V${168 + i * 16}M${170 + i * 4} ${152 + i * 16}V${168 + i * 16}`} stroke={C.shell} strokeWidth={1} />
        </g>
      ))}
      <rect x={30} y={58} width={70} height={46} rx={2} fill={C.screenSky} stroke={C.shell} strokeWidth={2} />
      <path d="M65 58V104M30 81H100" stroke={C.shell} strokeWidth={2} />
    </>
  );
}

function WifiBars({ x, y, bars }: { x: number; y: number; bars: number }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + i * 6} y={y - 4 - i * 4} width={4} height={4 + i * 4} rx={1} fill={i < bars ? C.ink : C.edge} opacity={i < bars ? 1 : 0.5} />
      ))}
    </g>
  );
}

const CAFE: Record<string, ReactNode> = {
  "cafe-library": (
    <g>
      <rect x={14} y={122} width={82} height={74} rx={4} fill={C.screenSky} stroke={C.edge} strokeWidth={3} />
      <rect x={26} y={146} width={58} height={50} fill={P.wall} />
      <path d="M22 148L55 132L88 148Z" fill={P.brick} />
      <text x={55} y={170} fontSize={16} fontWeight={700} fill={C.shell} fontFamily={sans} textAnchor="middle">Library</text>
      <rect x={48} y={178} width={14} height={18} fill={C.shell} />
    </g>
  ),
  "cafe-wifi-box": (
    <g>
      <path d="M178 160L174 140M204 160L208 140" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={172} y={158} width={38} height={16} rx={4} fill={C.part} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={182} cy={166} r={2} fill={C.ok} />
      <circle cx={190} cy={166} r={2} fill={C.ok} />
    </g>
  ),
  "cafe-laptop": (
    <g>
      <path d="M248 202L254 172H290L296 202Z" fill={C.part} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M242 204H302" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
    </g>
  ),
};

function CafeBase() {
  return (
    <>
      {/* The phone's Wi-Fi list. */}
      <rect x={8} y={4} width={304} height={104} rx={12} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <text x={20} y={26} fontSize={16} fontWeight={600} fill={C.muted} fontFamily={sans}>Wi-Fi</text>
      {[
        { name: "CornerCafe", bars: 3 },
        { name: "CornerCafe_Free", bars: 4 },
        { name: "Library_Guest", bars: 2 },
      ].map((row, i) => (
        <g key={row.name}>
          <rect x={14} y={34 + i * 24} width={292} height={22} rx={5} fill={C.part} />
          <text x={22} y={51 + i * 24} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={sans}>{row.name}</text>
          <WifiBars x={278} y={52 + i * 24} bars={row.bars} />
        </g>
      ))}
      {/* The café: floor, counter and staff member, table 4. */}
      <path d="M4 244H316" stroke={C.edge} strokeWidth={2} />
      <circle cx={138} cy={140} r={11} fill={P.wall} />
      <path d="M127 138A11 11 0 0 1 149 138C145 132 131 132 127 138Z" fill={C.shell} />
      <path d="M122 176Q122 154 138 154Q154 154 154 176Z" fill={C.part} stroke={C.ink} strokeWidth={1.5} />
      <path d="M131 158H145V176H131Z" fill={C.ink} opacity={0.85} />
      <rect x={108} y={174} width={110} height={70} rx={3} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <rect x={232} y={204} width={80} height={6} rx={2} fill={C.edge} />
      <path d="M244 210V244M300 210V244" stroke={C.edge} strokeWidth={3} />
      <rect x={258} y={214} width={28} height={26} rx={4} fill={C.part} stroke={C.ink} strokeWidth={1.5} />
      <text x={272} y={233} fontSize={16} fontWeight={700} fill={C.ink} fontFamily={sans} textAnchor="middle">4</text>
    </>
  );
}

/* ── Registry ─────────────────────────────────────────────────────────────────────────── */

const ART: Record<SceneId, { Base: () => ReactNode; parts: Record<string, ReactNode> }> = {
  "social-post": { Base: SocialPostBase, parts: POST },
  cafe: { Base: CafeBase, parts: CAFE },
  laptop: { Base: LaptopBase, parts: LAPTOP },
  phone: { Base: PhoneBase, parts: PHONE },
  "file-browser": { Base: FileBrowserBase, parts: FILES },
  email: textSceneArt(EMAIL_SCENE),
  "email-frozen-card": textSceneArt(EMAIL_FROZEN_SCENE),
  "email-payment": textSceneArt(EMAIL_PAYMENT_SCENE),
  "text-message": textSceneArt(TEXT_MESSAGE_SCENE),
  "text-message-tolls": textSceneArt(TEXT_TOLLS_SCENE),
  "fake-website": textSceneArt(FAKE_WEBSITE_SCENE),
  "phone-call": textSceneArt(PHONE_CALL_SCENE),
  "home-screen": { Base: HomeScreenBase, parts: HOME },
  "sign-in-options": { Base: SignInOptionsBase, parts: OPTIONS },
  "sign-in": { Base: SignInBase, parts: SIGN_IN },
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
