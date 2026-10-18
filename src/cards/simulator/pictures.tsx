import type { ReactNode } from "react";
import { MODELS } from "./models";
import type { ListItem } from "./models/types";

/*
 * Drawings for `picture` outputs: each model with `picture: true` has one here, keyed by its id.
 * The model's list output says what state each thing is in; the drawing shows it, and the view
 * reads the same list as text for screen readers. Drawn on the always-navy screen panel with the
 * fixed screen and scene tokens; every state is shown with a shape or word as well as colour.
 * Text is 16+ units in a 340-wide picture, so it reads at 14px or more on a phone.
 */

const C = {
  panel: "var(--color-scene-panel)",
  part: "var(--color-scene-part)",
  shell: "var(--color-scene-shell)",
  edge: "var(--color-scene-edge)",
  line: "var(--color-mascot-accessory)",
  ink: "var(--color-on-screen)",
  muted: "var(--color-on-screen-muted)",
  lit: "var(--color-screen-accent)",
  good: "var(--color-screen-success)",
  warn: "var(--color-scene-heat)",
  bg: "var(--color-screen)",
};
const sans = "var(--font-plex-sans), ui-sans-serif, sans-serif";

type Items = Record<string, ListItem | undefined>;
const on = (item: ListItem | undefined) => Boolean(item && item.state !== "off");

function Tick({ x, y, color = C.good }: { x: number; y: number; color?: string }) {
  return <path d={`M${x - 6} ${y}l4 4l8 -9`} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />;
}

/** A small skateboard photo (the post), drawn inside a phone's screen. */
function Photo({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const s = w / 84;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3 * s} fill={C.shell} />
      <path d={`M${x} ${y + h * 0.62}H${x + w}`} stroke={C.edge} strokeWidth={1.2 * s} />
      <rect x={x + w * 0.2} y={y + h * 0.42} width={w * 0.6} height={h * 0.13} rx={h * 0.065} fill={C.warn} />
      <circle cx={x + w * 0.32} cy={y + h * 0.62} r={h * 0.07} fill={C.ink} />
      <circle cx={x + w * 0.68} cy={y + h * 0.62} r={h * 0.07} fill={C.ink} />
    </g>
  );
}

function SmallPhone({ x, y, w, h, lit, children }: { x: number; y: number; w: number; h: number; lit: boolean; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(8, w / 5)} fill={C.panel} stroke={lit ? C.line : C.edge} strokeWidth={1.5} />
      {lit && <Photo x={x + 5} y={y + 8} w={w - 10} h={Math.min(h - 16, (w - 10) * 0.8)} />}
      {children}
    </g>
  );
}

/* ── post-spread ─────────────────────────────────────────────────────────────────────────── */

function PostSpreadPicture({ items, params }: { items: Items; params: Record<string, unknown> }) {
  const posted = on(items.post);
  const shared = on(items.shared);
  const saved = on(items.saved);
  const sharer = String(params.sharer ?? "Jo");
  const saver = String(params.saver ?? "Mo");
  const friendCount = Number(params.friends ?? 4);
  const extraCount = Number(params.sharedTo ?? 3);
  const friends = [
    { name: sharer, x: 52, y: 8 },
    { name: saver, x: 244, y: 8 },
    { name: "Ali", x: 52, y: 106 },
    { name: "Kai", x: 244, y: 106 },
  ].slice(0, friendCount);
  const extras = [4, 40, 76].slice(0, extraCount);
  return (
    <svg viewBox="0 0 340 200" className="block h-auto w-full" aria-hidden="true">
      {/* Dotted lines from the post to each friend (and on from the sharer). */}
      {posted &&
        friends.map((f) => (
          <path key={f.name} d={`M${f.x < 170 ? 120 : 220} ${f.y + 34}L${f.x < 170 ? f.x + 44 : f.x} ${f.y + 34}`} stroke={C.line} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
        ))}
      {shared &&
        extras.map((ey) => <path key={ey} d={`M52 42L28 ${ey + 16}`} stroke={C.line} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />)}
      {friends.map((f) => (
        <g key={f.name}>
          <SmallPhone x={f.x} y={f.y} w={44} h={70} lit={posted} />
          <text x={f.x + 22} y={f.y + 88} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={sans} textAnchor="middle">
            {f.name}
          </text>
        </g>
      ))}
      {shared && (
        <g>
          {extras.map((ey) => (
            <SmallPhone key={ey} x={6} y={ey} w={22} h={32} lit />
          ))}
          {/* Share arrow on the sharer's phone. */}
          <circle cx={92} cy={66} r={11} fill={C.bg} stroke={C.line} strokeWidth={1.5} />
          <path d="M87 70Q88 61 97 61M93 57l4 4l-4 4" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {saved && (
        <g>
          {/* A screenshot: the saver's screen flashes white, with a camera badge and "Saved". */}
          <rect x={249} y={16} width={34} height={27} rx={3} fill={C.ink} opacity={0.85} />
          <path d="M258 26h4l2 -3h6l2 3h4v11h-18Z" fill="none" stroke={C.bg} strokeWidth={1.8} strokeLinejoin="round" />
          <circle cx={267} cy={31} r={3.2} fill="none" stroke={C.bg} strokeWidth={1.8} />
          <text x={292} y={50} fontSize={16} fontWeight={600} fill={C.warn} fontFamily={sans}>Saved</text>
        </g>
      )}
      {/* The poster's phone, in the middle. */}
      <rect x={120} y={6} width={100} height={150} rx={14} fill={C.panel} stroke={C.edge} strokeWidth={2} />
      <rect x={155} y={12} width={30} height={4} rx={2} fill={C.edge} />
      <Photo x={130} y={24} w={80} h={64} />
      {posted ? (
        <g>
          <Tick x={146} y={124} />
          <text x={158} y={130} fontSize={16} fontWeight={600} fill={C.good} fontFamily={sans}>Posted</text>
        </g>
      ) : (
        <g>
          <rect x={138} y={106} width={64} height={34} rx={8} fill={C.lit} />
          <text x={170} y={129} fontSize={16} fontWeight={600} fill={C.bg} fontFamily={sans} textAnchor="middle">Post</text>
        </g>
      )}
      <text x={170} y={186} fontSize={16} fontWeight={600} fill={posted ? C.ink : C.muted} fontFamily={sans} textAnchor="middle">
        {items.friends?.detail === "Nobody yet" || !posted ? "Nobody has it yet" : `${items.friends?.detail} have it`}
      </text>
    </svg>
  );
}

/* ── privacy-switches ────────────────────────────────────────────────────────────────────── */

function Eye({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 11} ${y}Q${x} ${y - 10} ${x + 11} ${y}Q${x} ${y + 10} ${x - 11} ${y}Z`} fill="none" stroke={C.warn} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x} cy={y} r={3.5} fill={C.warn} />
    </g>
  );
}

function Lock({ x, y, color = C.good }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <rect x={x - 8} y={y - 2} width={16} height={12} rx={2.5} fill={color} />
      <path d={`M${x - 4.5} ${y - 2}V${y - 5}A4.5 4.5 0 0 1 ${x + 4.5} ${y - 5}V${y - 2}`} fill="none" stroke={color} strokeWidth={2} />
    </g>
  );
}

function PrivacyRow({ y, item, icon, hiddenIcon }: { y: number; item: ListItem | undefined; icon: ReactNode; hiddenIcon: ReactNode }) {
  const seen = on(item);
  return (
    <g>
      <rect x={4} y={y} width={332} height={50} rx={10} fill={C.panel} stroke={seen ? C.warn : C.edge} strokeWidth={1.5} />
      <rect x={12} y={y + 6} width={56} height={38} rx={6} fill={seen ? C.part : C.shell} />
      {seen ? icon : hiddenIcon}
      <text x={80} y={y + 22} fontSize={16} fontWeight={600} fill={C.ink} fontFamily={sans}>{item?.label}</text>
      <text x={80} y={y + 42} fontSize={16} fill={seen ? C.warn : C.good} fontFamily={sans}>{item?.detail}</text>
      {seen ? <Eye x={314} y={y + 25} /> : <Lock x={314} y={y + 25} />}
    </g>
  );
}

function PrivacySwitchesPicture({ items }: { items: Items }) {
  const tiles = (y: number) => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={16 + i * 17} y={y + 13} width={14} height={24} rx={2} fill={C.shell} />
          <rect x={18 + i * 17} y={y + 26} width={10} height={4} rx={2} fill={C.warn} />
        </g>
      ))}
    </g>
  );
  const pin = (y: number, color: string) => (
    <path d={`M40 ${y + 40}C32 ${y + 30} 30 ${y + 25} 30 ${y + 21}A10 10 0 0 1 50 ${y + 21}C50 ${y + 25} 48 ${y + 30} 40 ${y + 40}ZM40 ${y + 24}A3 3 0 1 0 40 ${y + 18}A3 3 0 1 0 40 ${y + 24}Z`} fill={color} fillRule="evenodd" />
  );
  const tagged = (y: number) => (
    <g>
      <rect x={22} y={y + 10} width={36} height={30} rx={3} fill={C.shell} />
      <circle cx={34} cy={y + 22} r={5} fill={C.muted} />
      <circle cx={47} cy={y + 22} r={5} fill={C.muted} />
      <path d={`M26 ${y + 40}Q34 ${y + 28} 40 ${y + 40}M40 ${y + 40}Q47 ${y + 28} 54 ${y + 40}`} fill={C.muted} />
    </g>
  );
  return (
    <svg viewBox="0 0 340 192" className="block h-auto w-full" aria-hidden="true">
      <text x={6} y={20} fontSize={16} fontWeight={600} fill={C.muted} fontFamily={sans}>What strangers can see</text>
      <PrivacyRow y={32} item={items.posts} icon={tiles(32)} hiddenIcon={<Lock x={40} y={57} color={C.muted} />} />
      <PrivacyRow
        y={86}
        item={items.location}
        icon={pin(86, C.warn)}
        hiddenIcon={
          <g>
            {pin(86, C.edge)}
            <path d="M28 98L52 124" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        }
      />
      <PrivacyRow
        y={140}
        item={items.tags}
        icon={tagged(140)}
        hiddenIcon={
          <g>
            <rect x={22} y={150} width={36} height={30} rx={3} fill={C.part} stroke={C.edge} strokeDasharray="3 3" />
            <text x={40} y={171} fontSize={16} fontWeight={600} fill={C.muted} fontFamily={sans} textAnchor="middle">?</text>
          </g>
        }
      />
    </svg>
  );
}

/* ── app-permissions ─────────────────────────────────────────────────────────────────────── */

const GLYPHS: Record<string, ReactNode> = {
  camera: <path d="M-9 -4h4l2 -3h6l2 3h4v11h-18ZM0 6A3.5 3.5 0 1 0 0 -1A3.5 3.5 0 1 0 0 6Z" fill="none" strokeWidth={1.8} strokeLinejoin="round" />,
  microphone: <path d="M-3 -9h6v9a3 3 0 0 1 -6 0ZM-7 0a7 7 0 0 0 14 0M0 7v3" fill="none" strokeWidth={1.8} strokeLinecap="round" />,
  location: <path d="M0 9C-5 3 -7 0 -7 -3A7 7 0 0 1 7 -3C7 0 5 3 0 9ZM0 -1A2 2 0 1 0 0 -5A2 2 0 1 0 0 -1Z" fill="none" strokeWidth={1.8} strokeLinejoin="round" />,
  contacts: <path d="M0 -1A4 4 0 1 0 0 -9A4 4 0 1 0 0 -1ZM-8 9C-8 3 -4 1 0 1C4 1 8 3 8 9Z" fill="none" strokeWidth={1.8} strokeLinejoin="round" />,
};

/** What an allowed permission reaches, drawn small in the window's corner. */
function Reach({ id, x, y }: { id: string; x: number; y: number }) {
  if (id === "camera")
    return (
      <g>
        <rect x={x} y={y} width={46} height={28} rx={3} fill={C.shell} />
        <rect x={x + 6} y={y + 12} width={14} height={12} rx={2} fill={C.warn} />
        <path d={`M${x + 28} ${y + 24}V${y + 10}l8 -3`} stroke={C.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </g>
    );
  if (id === "microphone")
    return <path d={`M${x} ${y + 14}h6l3 -9l5 18l5 -14l4 10l3 -5h6l3 -6l4 12l3 -6h4`} fill="none" stroke={C.warn} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
  if (id === "location")
    return (
      <g>
        <rect x={x} y={y} width={46} height={28} rx={3} fill={C.shell} />
        <path d={`M${x} ${y + 18}H${x + 46}M${x + 16} ${y}V${y + 28}`} stroke={C.edge} strokeWidth={2} />
        <path d={`M${x + 30} ${y + 22}C${x + 26} ${y + 17} ${x + 24} ${y + 14} ${x + 24} ${y + 11}A6 6 0 0 1 ${x + 36} ${y + 11}C${x + 36} ${y + 14} ${x + 34} ${y + 17} ${x + 30} ${y + 22}Z`} fill={C.warn} />
      </g>
    );
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={x + 5} cy={y + 5 + i * 9} r={3} fill={C.warn} />
          <rect x={x + 12} y={y + 3 + i * 9} width={30 - i * 6} height={4} rx={2} fill={C.muted} />
        </g>
      ))}
    </g>
  );
}

function AppPermissionsPicture({ items }: { items: Items }) {
  const order = ["camera", "microphone", "location", "contacts"];
  return (
    <svg viewBox="0 0 340 152" className="block h-auto w-full" aria-hidden="true">
      {order.map((id, i) => {
        const item = items[id];
        const allowed = on(item);
        const x = 4 + (i % 2) * 168;
        const y = 4 + Math.floor(i / 2) * 76;
        return (
          <g key={id}>
            <rect x={x} y={y} width={164} height={70} rx={10} fill={allowed ? C.panel : C.shell} stroke={allowed ? C.warn : C.edge} strokeWidth={1.5} strokeDasharray={allowed ? undefined : "4 4"} />
            <g transform={`translate(${x + 18} ${y + 20})`} stroke={allowed ? C.ink : C.muted}>
              {GLYPHS[id]}
            </g>
            <text x={x + 34} y={y + 26} fontSize={16} fontWeight={600} fill={allowed ? C.ink : C.muted} fontFamily={sans}>
              {id === "microphone" ? "Mic" : item?.label}
            </text>
            {allowed ? <Reach id={id} x={x + 110} y={y + 8} /> : <path d={`M${x + 124} ${y + 12}l18 18M${x + 142} ${y + 12}l-18 18`} stroke={C.muted} strokeWidth={2} strokeLinecap="round" />}
            <text x={x + 10} y={y + 58} fontSize={16} fill={allowed ? C.warn : C.muted} fontFamily={sans}>
              {allowed ? item?.detail : "Off"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Registry ────────────────────────────────────────────────────────────────────────────── */

const PICTURES: Record<string, (props: { items: Items; params: Record<string, unknown> }) => ReactNode> = {
  "post-spread": PostSpreadPicture,
  "privacy-switches": PrivacySwitchesPicture,
  "app-permissions": AppPermissionsPicture,
};

export function hasSimulatorPicture(modelId: string): boolean {
  return modelId in PICTURES;
}

/** The model's drawing of its list output, with the same list as text for screen readers. */
export function SimulatorPicture({ modelId, params, items, label }: { modelId: string; params: unknown; items: ListItem[]; label: string }) {
  const Draw = PICTURES[modelId];
  const model = MODELS[modelId];
  if (!Draw || !model) return null;
  const parsed = model.params.safeParse(params);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  return (
    <figure className="rounded-card bg-screen p-2 sm:p-3">
      <Draw items={byId} params={(parsed.success ? parsed.data : {}) as Record<string, unknown>} />
      <figcaption className="sr-only" aria-live="polite">
        {label}: {items.map((i) => `${i.label}: ${i.detail ?? ""}`).join(". ")}
      </figcaption>
    </figure>
  );
}
