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

/* ── Scam-spotting scenes (all fictional; every address is a reserved .example domain) ───── */

function Line({ x, y, size = 9, weight = 400, font = sans, fill = C.ink, children }: {
  x: number;
  y: number;
  size?: number;
  weight?: number;
  font?: string;
  fill?: string;
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} fontFamily={font}>
      {children}
    </text>
  );
}

function WindowFrame({ width, height, title }: { width: number; height: number; title: string }) {
  return (
    <>
      <rect x={4} y={4} width={width - 8} height={height - 8} rx={8} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      <path d={`M4 26V12A8 8 0 0 1 12 4H${width - 12}A8 8 0 0 1 ${width - 4} 12V26Z`} fill={C.shell} />
      {[16, 26, 36].map((x) => (
        <circle key={x} cx={x} cy={15} r={3} fill={C.edge} />
      ))}
      <Line x={52} y={19} size={9} fill={C.muted}>
        {title}
      </Line>
    </>
  );
}

const EMAIL: Record<string, ReactNode> = {
  "email-from": (
    <g>
      <Line x={14} y={49} size={8.5} fill={C.muted}>From:</Line>
      <Line x={40} y={49} size={8.5} weight={600}>Your Bank</Line>
      <Line x={84} y={49} size={8} font={mono} fill={C.muted}>&lt;security@yourbank-help.example&gt;</Line>
    </g>
  ),
  "email-date": <Line x={14} y={67} size={8} fill={C.muted}>Received today at 9:12 am</Line>,
  "email-subject": (
    <Line x={14} y={90} size={10} weight={600}>
      URGENT: Your account will be closed in 24 hours
    </Line>
  ),
  "email-greeting": <Line x={14} y={113} size={9}>Dear Customer,</Line>,
  "email-secrets": (
    <g>
      <Line x={14} y={131} size={9}>We noticed unusual activity on your account. To keep it</Line>
      <Line x={14} y={144} size={9}>open, reply with your password and your card number.</Line>
    </g>
  ),
  "email-link": (
    <g>
      <rect x={14} y={158} width={112} height={22} rx={4} fill={C.edge} />
      <Line x={27} y={173} size={9} weight={600} fill={C.bg}>Verify my account</Line>
      <Line x={14} y={194} size={7.5} fill={C.muted}>Link goes to:</Line>
      <Line x={60} y={194} size={7.5} font={mono} fill={C.muted}>http://yourbank-verify.example/login</Line>
    </g>
  ),
  "email-signoff": <Line x={14} y={221} size={9}>Thanks, the Security Team</Line>,
};

function EmailBase() {
  return (
    <>
      <WindowFrame width={320} height={236} title="Mail · Inbox" />
      <path d="M10 99H310" stroke={C.edge} strokeWidth={0.75} opacity={0.6} />
    </>
  );
}

function Bubble({ y, h, dim = false }: { y: number; h: number; dim?: boolean }) {
  return <rect x={26} y={y} width={148} height={h} rx={10} fill={dim ? C.shell : C.part} stroke={C.edge} strokeWidth={0.75} />;
}

const TEXTS: Record<string, ReactNode> = {
  "sms-sender": (
<Line x={78} y={48} size={10} weight={600}>Parcels</Line>
  ),
  "sms-earlier": (
    <g>
      <Line x={82} y={72} size={7} fill={C.muted}>Monday</Line>
      <Bubble y={78} h={46} dim />
      <Line x={34} y={94} size={8.5}>Your parcel is on its way.</Line>
      <Line x={34} y={106} size={8.5}>Track it in the Parcels</Line>
      <Line x={34} y={118} size={8.5}>app.</Line>
    </g>
  ),
  "sms-time": <Line x={70} y={148} size={7} fill={C.muted}>Today, 7:41 pm</Line>,
  "sms-fee": (
    <g>
      <Bubble y={156} h={70} />
      <Line x={34} y={172} size={8.5}>We tried to deliver your</Line>
      <Line x={34} y={184} size={8.5}>parcel. Pay a $1.95 fee</Line>
    </g>
  ),
  "sms-deadline": <Line x={34} y={196} size={8.5}>within 2 hours, or it goes back:</Line>,
  "sms-link": (
    <Line x={34} y={214} size={7.5} font={mono} fill={C.ink}>
      parcels-redelivery.example/pay
    </Line>
  ),
};

function TextMessageBase() {
  return (
    <>
      <rect x={20} y={8} width={160} height={256} rx={26} fill={C.shell} stroke={C.edge} strokeWidth={2} />
      <rect x={26} y={14} width={148} height={244} rx={22} fill={C.bg} />
      <path d="M26 60H174" stroke={C.edge} strokeWidth={0.75} opacity={0.6} />
      <Line x={40} y={30} size={7} fill={C.muted}>‹ Messages</Line>
      {/* The message box at the bottom (not tappable) */}
      <rect x={34} y={232} width={132} height={20} rx={10} fill="none" stroke={C.edge} strokeWidth={0.75} />
      <Line x={44} y={245} size={7.5} fill={C.muted}>Text message</Line>
    </>
  );
}

function Field({ y, label }: { y: number; label: string }) {
  return (
    <g>
      <Line x={64} y={y + 10} size={7.5} fill={C.muted}>{label}</Line>
      <rect x={64} y={y + 13} width={192} height={9} rx={2} fill={C.bg} stroke={C.edge} strokeWidth={0.75} />
    </g>
  );
}

const SITE: Record<string, ReactNode> = {
  "site-padlock": (
    <g fill="none" stroke={C.ink} strokeWidth={1.3}>
      <rect x={17} y={40} width={12} height={9} rx={1.5} fill={C.ink} stroke="none" />
      <path d="M19.5 40V37A3.5 3.5 0 0 1 26.5 37V40" />
    </g>
  ),
  "site-address": (
    <g>
      <rect x={36} y={31} width={272} height={20} rx={10} fill={C.bg} stroke={C.edge} strokeWidth={0.75} />
      <Line x={46} y={44} size={7.5} font={mono}>https://yourbank.example.login-check.example/signin</Line>
    </g>
  ),
  "site-logo": (
    <g>
      <rect x={16} y={66} width={18} height={18} rx={4} fill={C.edge} />
      <path d="M20 80L25 70L30 80Z" fill={C.bg} />
      <Line x={40} y={80} size={11} weight={600}>Your Bank</Line>
    </g>
  ),
  "site-banner": (
    <g>
      <rect x={14} y={96} width={292} height={20} rx={4} fill="none" stroke={C.warn} strokeWidth={1.2} />
      <Line x={20} y={109} size={8} weight={600} fill={C.warn}>Your account is locked! Sign in within 10 minutes to unlock it.</Line>
    </g>
  ),
  "site-username": <Field y={124} label="Username" />,
  "site-password": <Field y={152} label="Password" />,
  "site-pin": <Field y={180} label="Card PIN" />,
  "site-footer": <Line x={16} y={223} size={7.5} fill={C.muted}>Your Bank · Privacy · Help</Line>,
};

function FakeWebsiteBase() {
  return (
    <>
      <rect x={4} y={4} width={312} height={228} rx={8} fill={C.panel} stroke={C.edge} strokeWidth={1.5} />
      <path d="M4 26V12A8 8 0 0 1 12 4H304A8 8 0 0 1 316 12V26Z" fill={C.shell} />
      {[16, 26, 36].map((x) => (
        <circle key={x} cx={x} cy={15} r={3} fill={C.edge} />
      ))}
      <path d="M4 56H316" stroke={C.edge} strokeWidth={0.75} opacity={0.6} />
    </>
  );
}

/* ── Registry ─────────────────────────────────────────────────────────────────────────── */

const ART: Record<SceneId, { Base: () => ReactNode; parts: Record<string, ReactNode> }> = {
  laptop: { Base: LaptopBase, parts: LAPTOP },
  phone: { Base: PhoneBase, parts: PHONE },
  "file-browser": { Base: FileBrowserBase, parts: FILES },
  email: { Base: EmailBase, parts: EMAIL },
  "text-message": { Base: TextMessageBase, parts: TEXTS },
  "fake-website": { Base: FakeWebsiteBase, parts: SITE },
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
