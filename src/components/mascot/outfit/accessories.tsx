import type { ReactNode } from "react";
import { EYES, JOINT_R, SHOULDERS } from "../geometry";

/*
 * Avatar accessories (avatars v2, art direction: docs/brand/avatars.png), drawn as plain SVG layers
 * in the mascot's own coordinates: head items in the head's 64-unit shield grid (they tilt with
 * it), body items in the 200 × 232 viewBox. A lighter, brighter blue over a lighter navy, so they
 * stand out from the body. `small` drops fine detail (ribs, tassels, drawstrings) below ~40px.
 */

export interface AccessoryStyle {
  line: string;
  fill: string;
  /** The mascot's own line colour (joints redrawn over the hoodie). */
  body: string;
  glow: string;
  small: boolean;
}

export type Layer = "behind" | "torso" | "neck" | "head";
type Draw = (s: AccessoryStyle) => ReactNode;

export const ACCESSORY_TOKENS = { line: "var(--color-mascot-accessory)", fill: "var(--color-mascot-accessory-fill)", body: "var(--color-mascot-line)" };

const shape = (s: AccessoryStyle, width = 1.6) => ({ fill: s.fill, stroke: s.line, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });
const line = (s: AccessoryStyle, width = 1.2) => ({ fill: "none", stroke: s.line, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/** A point on the beanie cuff's top and bottom curves (they bow up in the middle). */
const bow = (x: number, edge: number, lift: number) => edge - lift * (1 - ((x - 32) / 22.5) ** 2);

const DRAWINGS: Record<string, Partial<Record<Layer, Draw>>> = {
  cap: {
    head: (s) => (
      <g>
        {/* Worn backwards: the brim sticks out behind, to the side. */}
        <path d="M44 14.5C52 12 60 12.5 63.5 16C60 18.5 52 19 45 18Z" {...shape(s)} />
        <path d="M10 17.5C10 8 20 2.5 32 2.5C44 2.5 54 8 54 17.5C46 15.3 18 15.3 10 17.5Z" {...shape(s)} />
        <rect x={26} y={10.5} width={12} height={5} rx={2.5} {...line(s, 1.2)} />
        {!s.small && <path d="M32 3V10.5" {...line(s, 0.9)} />}
      </g>
    ),
  },
  beanie: {
    head: (s) => (
      <g>
        <path d="M11.5 15C11.5 5 20.5 0 32 0C43.5 0 52.5 5 52.5 15Z" {...shape(s)} />
        <path d="M9.5 12.5C22 9.6 42 9.6 54.5 12.5L54 19C42 16.1 22 16.1 10 19Z" {...shape(s)} />
        {!s.small &&
          [14, 18, 22, 26, 30, 34, 38, 42, 46, 50].map((x) => (
            <path key={x} d={`M${x} ${bow(x, 12.5, 2.4) + 1.2}V${bow(x, 19, 2.6) - 1.2}`} {...line(s, 0.8)} />
          ))}
      </g>
    ),
  },
  headband: {
    head: (s) => (
      <g>
        <path d="M55 15C60 10 64 10 66 12C63 15 59 16 55.5 16Z" {...shape(s, 1.3)} />
        <path d="M55 17C60 18 63 22 63.5 25C60 24 57 21 55 18Z" {...shape(s, 1.3)} />
        <path d="M10.5 14C20 9 44 9 53.5 14L53.5 18.5C44 13.5 20 13.5 10.5 18.5Z" {...shape(s)} />
        <circle cx={54.5} cy={16.2} r={2.3} {...shape(s, 1.3)} />
        {!s.small && <path d="M12 16.2C21 11.5 43 11.5 52 16.2" {...line(s, 0.7)} />}
      </g>
    ),
  },
  headset: {
    head: (s) => (
      <g>
        <path d="M9.5 25C9.5 4 54.5 4 54.5 25" fill="none" stroke={s.line} strokeWidth={3.8} strokeLinecap="round" />
        <path d="M9.5 25C9.5 4 54.5 4 54.5 25" fill="none" stroke={s.fill} strokeWidth={1.6} strokeLinecap="round" />
        <rect x={4.5} y={19} width={8} height={13} rx={3.5} {...shape(s)} />
        <rect x={51.5} y={19} width={8} height={13} rx={3.5} {...shape(s)} />
        {!s.small && (
          <>
            <rect x={6.8} y={21.5} width={3.4} height={8} rx={1.7} {...line(s, 0.7)} />
            <rect x={53.8} y={21.5} width={3.4} height={8} rx={1.7} {...line(s, 0.7)} />
          </>
        )}
        <path d="M56 31.5C56 40 50 45.5 41.5 45.5" {...line(s, 1.5)} />
        <circle cx={40.2} cy={45.5} r={2} fill={s.line} />
      </g>
    ),
  },
  "grad-cap": {
    head: (s) => (
      <g>
        <path d="M13.5 14C24 10 40 10 50.5 14L50 18.5C40 15 24 15 14 18.5Z" {...shape(s)} />
        <path d="M2 8.5L32 0.5L62 8.5L32 15Z" {...shape(s)} />
        <circle cx={32} cy={7.8} r={1.3} fill={s.line} />
        {!s.small && (
          <>
            <path d="M32 7.8L57 10L57.5 20" {...line(s, 0.9)} />
            <path d="M56 20H59L59.6 26H55.4Z" fill={s.line} />
          </>
        )}
      </g>
    ),
  },
  crown: {
    head: (s) => (
      <g>
        <path
          d="M11.5 16.5L10 5L17.5 10.5L22.5 1.5L27.5 10L32 4.5L36.5 10L41.5 1.5L46.5 10.5L54 5L52.5 16.5C44 14 20 14 11.5 16.5Z"
          {...shape(s)}
        />
        {/* Circuit nodes on the points, glowing like the mascot's joints. */}
        {[
          [10, 5],
          [22.5, 1.5],
          [41.5, 1.5],
          [54, 5],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={1.9} fill={s.line} filter={`url(#${s.glow})`} />
        ))}
        {!s.small && (
          <>
            <path d="M14 14C24 12 40 12 50 14" {...line(s, 0.8)} />
            {[19, 32, 45].map((x) => (
              <circle key={x} cx={x} cy={12.9} r={0.9} fill={s.line} />
            ))}
          </>
        )}
      </g>
    ),
  },
  glasses: {
    head: (s) => (
      <g {...line(s, 1.8)}>
        {EYES.map((e, i) => (
          <circle key={i} cx={e.x} cy={e.y} r={8.6} />
        ))}
        <path d="M30.7 21.3Q32 19.8 33.3 21.3" />
        <path d="M13.7 22L11.4 21M50.3 22L52.6 21" />
        {!s.small && EYES.map((e, i) => <path key={i} d={`M${e.x - 5.5} ${e.y - 3}Q${e.x - 4.5} ${e.y - 5.8} ${e.x - 1.5} ${e.y - 6.6}`} strokeWidth={0.8} />)}
      </g>
    ),
  },
  visor: {
    head: (s) => (
      <g>
        {/* See-through lens: the eyes still show, so the face stays the face. */}
        <rect x={8} y={15.5} width={48} height={15.5} rx={7.5} fill={s.line} fillOpacity={0.22} stroke={s.line} strokeWidth={1.8} />
        <circle cx={57} cy={23.3} r={2.6} {...shape(s, 1.3)} />
        {!s.small && (
          <>
            <path d="M32 16.5V30" {...line(s, 0.8)} />
            <path d="M13 19.5H21" {...line(s, 1.1)} />
          </>
        )}
      </g>
    ),
  },
  scarf: {
    neck: (s) => (
      <g>
        <path d="M106 162L103 190H115L117 162Z" {...shape(s, 2.5)} />
        <path d="M80 150C92 159 112 159 123 149L124 159C112 170 91 170 79 160Z" {...shape(s, 2.5)} />
        {!s.small && (
          <>
            <path d="M104.5 190.5V195M107.5 190.5V195.5M110.5 190.5V195.5M113.5 190.5V195" {...line(s, 1.4)} />
            <path d="M104.8 174H116M104.3 182H115.5" {...line(s, 1.2)} />
          </>
        )}
      </g>
    ),
  },
  hoodie: {
    // The hood, down behind the neck: it peeks out either side of the head in a small avatar.
    behind: (s) => <path d="M70 156C61 144 62 131 74 126L130 126C142 131 143 144 134 156Z" {...shape(s, 2.6)} />,
    torso: (s) => (
      <g>
        <path d="M78 157C78 150.5 86 147.5 100 147.5C114 147.5 122 150.5 122 157L125 185C125 191.5 117 194.5 100 194.5C83 194.5 75 191.5 75 185Z" {...shape(s, 3)} />
        <path d="M85 150.5C91 158 109 158 115 150.5" {...line(s, 2.4)} />
        <path d="M86 176C95 172.5 105 172.5 114 176L115.5 186C105 188.5 95 188.5 84.5 186Z" {...line(s, 1.8)} />
        {!s.small && (
          <>
            <path d="M95 156V167M105 156V167" {...line(s, 1.5)} />
            <circle cx={95} cy={168.5} r={1.5} fill={s.line} />
            <circle cx={105} cy={168.5} r={1.5} fill={s.line} />
          </>
        )}
        {/* The shoulder joints stay lit over the hoodie, where the arms join. */}
        {SHOULDERS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={JOINT_R.shoulder} fill={s.body} filter={`url(#${s.glow})`} />
        ))}
      </g>
    ),
  },
  jetpack: {
    behind: (s) => (
      <g>
        {[58, 125].map((x) => (
          <g key={x}>
            <path d={`M${x + 2.5} 185H${x + 14.5}L${x + 12} 195H${x + 5}Z`} {...shape(s, 2)} />
            <rect x={x} y={138} width={17} height={47} rx={8} {...shape(s, 2.5)} />
            {!s.small && <path d={`M${x + 1.5} 148H${x + 15.5}M${x + 1.5} 175H${x + 15.5}`} {...line(s, 1.2)} />}
          </g>
        ))}
      </g>
    ),
    torso: (s) => (
      <g>
        <path d="M86 151C88 160 89 170 90 180M114 151C112 160 111 170 110 180" {...line(s, 2.6)} />
        <rect x={95.5} y={164} width={9} height={6} rx={1.5} {...shape(s, 1.6)} />
      </g>
    ),
  },
  cape: {
    behind: (s) => (
      <g>
        <path d="M80 150C92 156 108 156 120 150C132 166 144 188 154 211C142 206 130 209 120 215C109 208 96 208 86 215C76 209 62 207 49 211C59 190 70 167 80 150Z" {...shape(s, 2.5)} />
        {/* A standing collar behind the head, so the cape still shows in a small round avatar. */}
        <path d="M84 152L55 126C68 129 80 136 92 146ZM120 152L149 126C136 129 124 136 112 146Z" {...shape(s, 2.2)} />
        {!s.small && <path d="M102 163C104 180 106 195 108 208M134 178C138 189 142 198 145 206M66 182C63 192 59 200 56 207" {...line(s, 1.2)} />}
      </g>
    ),
    neck: (s) => (
      <g>
        <path d="M90 154Q100 158 110 154" {...line(s, 1.6)} />
        <circle cx={90} cy={154} r={2.3} fill={s.line} />
        <circle cx={110} cy={154} r={2.3} fill={s.line} />
      </g>
    ),
  },
};

/** The layers an item draws into (a jetpack has tanks behind and straps in front). */
export function accessoryLayers(id: string): Layer[] {
  return Object.keys(DRAWINGS[id] ?? {}) as Layer[];
}

export function drawAccessory(id: string, layer: Layer, style: AccessoryStyle): ReactNode {
  return DRAWINGS[id]?.[layer]?.(style) ?? null;
}

export const DRAWN_ITEM_IDS = Object.keys(DRAWINGS);
