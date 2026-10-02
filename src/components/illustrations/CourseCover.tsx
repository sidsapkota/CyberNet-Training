"use client";

import { type ReactNode, useId } from "react";
import { HUB, NODES, SHIELD_PATH } from "@/components/brand/geometry";
import { MASCOT_TOKENS } from "@/components/mascot/geometry";
import { GlowFilter, MascotFigure } from "@/components/mascot/parts";
import { MASCOT_POSES } from "@/components/mascot/poses";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ACCENT_ART, courseAccent } from "@/lib/content/courseTheme";

/*
 * Course thumbnails (owner, 2 Oct 2026): one big hero object per course that you recognise in under
 * a second, on the always-navy panel, in the course's identity colour (src/lib/content/courseTheme.ts).
 *
 * THE TEMPLATE (every course, including future ones like "What Really Happens When…"):
 * - A 320 × 180 viewBox on the navy `screen` panel; no dot grid, no extra decoration: one idea.
 * - Lines: `ART.stroke` (2) everywhere, round caps and joins, rounded corners (rx 3–12). Outlines in
 *   the light accessory blue (`ART.line`), fills in the mascot's navy (`ART.fill`, `ART.raised`).
 * - The course's colour (`accent`) only on the hero detail (the shield, the battery and chip, the
 *   card and the learning link, the envelope and its route).
 * - The mascot, when it appears, is the real avatars v2 mascot (`CoverMascot`, scale ~0.62).
 * - One short motion on hover, focus or tap of the parent's `group` class: a `MOVE_*` class (the
 *   `cover-*` keyframes in theme.css) or `motion-safe:` transitions; never a loop, nothing under
 *   reduced motion. Class names are written out in full so Tailwind generates them.
 * - Register it in `COVERS` and give the course an accent and a token pair; a test checks both.
 */

const VIEW_W = 320;
const VIEW_H = 180;

export const ART = {
  stroke: 2,
  line: "var(--color-mascot-accessory)",
  fill: "var(--color-mascot-body)",
  raised: "var(--color-mascot-accessory-fill)",
} as const;

const outline = { fill: ART.fill, stroke: ART.line, strokeWidth: ART.stroke, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const stroke = (color: string, width: number = ART.stroke) => ({ fill: "none", stroke: color, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/* One short move on hover, keyboard focus or a tap of the card around the cover (its `group`). */
const MOVE_SWING = "motion-safe:group-hover:animate-cover-swing motion-safe:group-focus-visible:animate-cover-swing motion-safe:group-active:animate-cover-swing";
const MOVE_ZIP = "motion-safe:group-hover:animate-cover-zip motion-safe:group-focus-visible:animate-cover-zip motion-safe:group-active:animate-cover-zip";
const MOVE_TILT = "motion-safe:group-hover:animate-cover-tilt motion-safe:group-focus-visible:animate-cover-tilt motion-safe:group-active:animate-cover-tilt";
const MOVE_BLINK = "motion-safe:group-hover:animate-cover-blink motion-safe:group-focus-visible:animate-cover-blink motion-safe:group-active:animate-cover-blink";
const SPREAD = "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out";
const SPREAD_BACK = "motion-safe:group-hover:translate-x-3 motion-safe:group-focus-visible:translate-x-3 motion-safe:group-active:translate-x-3";
const SPREAD_MIDDLE = "motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1 motion-safe:group-active:translate-x-1";
const SPREAD_FRONT = "motion-safe:group-hover:-translate-x-3 motion-safe:group-focus-visible:-translate-x-3 motion-safe:group-active:-translate-x-3";

interface CoverProps {
  accent: string;
  glow: string;
}

/** The real mascot (the waving pose), placed and scaled in the cover. */
function CoverMascot({ x, y, scale, glow }: { x: number; y: number; scale: number; glow: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <MascotFigure pose={MASCOT_POSES.happy} palette={MASCOT_TOKENS} glow={glow} />
    </g>
  );
}

/* ── Stay Safe Online: the mascot holds up a shield; a phishing hook bounces off it ──────── */

function SafeOnlineCover({ accent, glow }: CoverProps) {
  const s = 1.18;
  const [shieldX, shieldY] = [170 - 32 * s, 92 - 32.5 * s];
  return (
    <>
      <CoverMascot x={152} y={20} scale={0.64} glow={glow} />
      {/* The shield (the logo's own), held up in the waving hand. */}
      <g transform={`translate(${shieldX} ${shieldY}) scale(${s})`}>
        <path d={SHIELD_PATH} fill={ART.fill} stroke={accent} strokeWidth={(ART.stroke * 1.4) / s} strokeLinejoin="round" />
        <g stroke={accent} strokeWidth={ART.stroke / s} strokeLinecap="round">
          {NODES.map((n, i) => (
            <path key={i} d={`M${HUB.x} ${HUB.y}L${n.x} ${n.y}`} />
          ))}
        </g>
        <circle cx={HUB.x} cy={HUB.y} r={4.6} fill={accent} />
        {NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={3.2} fill={accent} />
        ))}
      </g>
      {/* The hook on its line, glancing off the shield's edge. */}
      <g className={MOVE_SWING} style={{ transformBox: "view-box", transformOrigin: "84px -6px" }}>
        <path d="M84 -6L126 64" {...stroke(ART.line, 1.5)} />
        <path d="M126 64V80A7 7 0 0 1 112 80V76" {...stroke(ART.line)} />
        <path d="M112 76L109 81" {...stroke(ART.line)} />
      </g>
      {/* Where it hit: two short marks, nothing more. */}
      <path d="M137 70L143 66M136 79L143 79" {...stroke(accent, 1.6)} />
    </>
  );
}

/* ── Inside Your Devices: a phone pulled apart into floating layers ──────────────────────── */

function DevicesCover({ accent }: CoverProps) {
  return (
    <>
      {/* Back: the board, with the processor chip. */}
      <g className={`${SPREAD} ${SPREAD_BACK}`}>
        <rect x={176} y={44} width={64} height={112} rx={12} {...outline} />
        <rect x={197} y={70} width={22} height={22} rx={3} fill={ART.raised} stroke={accent} strokeWidth={ART.stroke} />
        <path d="M201 66V70M208 66V70M215 66V70M201 92V96M208 92V96M215 92V96M193 74H197M193 81H197M193 88H197M219 74H223M219 81H223M219 88H223" {...stroke(accent, 1.5)} />
        <rect x={190} y={110} width={14} height={10} rx={2} {...stroke(ART.line, 1.5)} />
        <rect x={210} y={110} width={14} height={10} rx={2} {...stroke(ART.line, 1.5)} />
      </g>
      {/* Middle: the battery, with its bolt. */}
      <g className={`${SPREAD} ${SPREAD_MIDDLE}`}>
        <rect x={130} y={34} width={64} height={112} rx={12} {...outline} />
        <rect x={142} y={52} width={40} height={76} rx={6} fill={ART.raised} stroke={ART.line} strokeWidth={ART.stroke} />
        <path d="M165 68L152 92H162L158 112L172 86H162Z" fill={accent} stroke={accent} strokeWidth={1} strokeLinejoin="round" />
      </g>
      {/* Front: the screen. */}
      <g className={`${SPREAD} ${SPREAD_FRONT}`}>
        <rect x={84} y={24} width={64} height={112} rx={12} {...outline} />
        <rect x={90} y={34} width={52} height={92} rx={6} fill={ART.raised} />
        <circle cx={116} cy={29} r={1.6} fill={ART.line} />
        <path d="M98 44L112 58" {...stroke(ART.line, 1.5)} />
      </g>
    </>
  );
}

/* ── How AI Really Works: the mascot shows a picture card to a small robot that's learning ─ */

function AiCover({ accent, glow }: CoverProps) {
  return (
    <>
      <CoverMascot x={40} y={24} scale={0.62} glow={glow} />
      {/* What the robot takes in: dots from the card to its head. */}
      <path d="M86 58Q150 26 208 78" {...stroke(accent, 2)} strokeDasharray="0.1 7" />
      {/* The picture card (an apple on it), held up in the waving hand. */}
      <g className={MOVE_TILT} style={{ transformBox: "view-box", transformOrigin: "70px 104px" }}>
        <g transform="rotate(-6 60 77)">
          <rect x={42} y={54} width={36} height={46} rx={5} fill={ART.raised} stroke={accent} strokeWidth={ART.stroke} />
          <path d="M60 70C55 66 49 68 49 75C49 82 55 88 58 88C59 88 60 87 60 87C60 87 61 88 62 88C65 88 71 82 71 75C71 68 65 66 60 70Z" {...stroke(ART.line, 1.6)} />
          <path d="M60 70C60 66 61 64 63 63" {...stroke(ART.line, 1.6)} />
        </g>
      </g>
      {/* The little robot: square head, antenna light in the course colour, eyes on the card. */}
      <g>
        <path d="M238 78V66" {...stroke(ART.line)} />
        <circle cx={238} cy={63} r={3.6} fill={accent} filter={`url(#${glow})`} className={MOVE_BLINK} />
        <rect x={214} y={78} width={48} height={38} rx={10} {...outline} />
        <circle cx={228} cy={95} r={4.5} fill={ART.line} />
        <circle cx={248} cy={95} r={4.5} fill={ART.line} />
        <circle cx={226.6} cy={94} r={1.8} fill={ART.fill} />
        <circle cx={246.6} cy={94} r={1.8} fill={ART.fill} />
        <rect x={222} y={120} width={32} height={28} rx={6} {...outline} />
        <path d="M222 128L212 136M254 128L264 136M230 148V156M246 148V156" {...stroke(ART.line)} />
      </g>
    </>
  );
}

/* ── How the Internet Works: an envelope zipping along a route over a simple globe ───────── */

function InternetCover({ accent }: CoverProps) {
  return (
    <>
      {/* The globe: an outline, one meridian, the equator and two lines of latitude. */}
      <circle cx={160} cy={98} r={56} {...outline} />
      <ellipse cx={160} cy={98} rx={22} ry={56} {...stroke(ART.line)} />
      <path d="M104 98H216M111 72H209M111 124H209" {...stroke(ART.line)} />
      {/* The route over the top, ending in a node. */}
      <path d="M30 140C90 20 230 20 290 70" {...stroke(accent, 2)} strokeDasharray="0.1 7" />
      <circle cx={290} cy={70} r={4} fill={accent} />
      {/* The envelope, on its way. */}
      <g className={MOVE_ZIP}>
        <g transform="translate(74 82)">
          <rect x={-15} y={-10} width={30} height={20} rx={3} fill={ART.fill} stroke={accent} strokeWidth={ART.stroke} />
          <path d="M-15 -8L0 3L15 -8" {...stroke(accent)} />
        </g>
      </g>
    </>
  );
}

const COVERS: Record<string, (props: CoverProps) => ReactNode> = {
  "stay-safe-online": SafeOnlineCover,
  "inside-your-devices": DevicesCover,
  "how-ai-really-works": AiCover,
  "how-the-internet-works": InternetCover,
};

export const COVER_COURSE_IDS = Object.keys(COVERS);

/**
 * A course's thumbnail on the navy panel. Its one motion runs on hover, focus or tap of the nearest
 * `group` (the course card, the path's side panel, the course header). A course without its own
 * cover gets the logo network.
 */
export function CourseCover({ courseId, title, className = "" }: { courseId: string; title: string; className?: string }) {
  const Cover = COVERS[courseId];
  const glow = `cover-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className={`relative overflow-hidden bg-screen ${className}`}>
      {Cover ? (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${title}: illustration`} className="absolute inset-0 size-full">
          <defs>
            <GlowFilter id={glow} />
          </defs>
          <Cover accent={ACCENT_ART[courseAccent(courseId)]} glow={glow} />
        </svg>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <NetworkMark mode="lit" className="size-20" label={`${title}: illustration`} />
        </div>
      )}
    </div>
  );
}
