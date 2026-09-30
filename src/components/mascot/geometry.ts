/**
 * The mascot's fixed geometry, in a 200 × 232 viewBox. The head is the logo shield from
 * `src/components/brand/geometry.ts` (its 64-unit grid), scaled and tilted; the face is the logo's
 * nodes: top two = eyes, hub = nose/core, bottom two = cheek lights.
 *
 * Shapes that must look identical in every pose (mouth, hands, boots) are defined once here.
 */
import { HUB, NODES, SHIELD_PATH } from "@/components/brand/geometry";

export const MASCOT_VIEWBOX = { width: 200, height: 232 } as const;

/** Head placement: the shield grid's centre (32, 32) sits here, scaled up. */
export const HEAD = { x: 102, y: 100, scale: 2.3 } as const;
export const HEAD_SHIELD_PATH = SHIELD_PATH;

/** Face, in shield-grid units. Eyes sit on the logo's top nodes, nudged down to fit the shield. */
const [topLeft, topRight, bottomRight, bottomLeft] = NODES;
export const EYES = [
  { x: topLeft.x + 0.3, y: topLeft.y + 1.8 },
  { x: topRight.x - 0.3, y: topRight.y + 1.8 },
] as const;
export const EYE_R = 7;
export const EYE_R_WIDE = 7.8;
export const PUPIL_R = 3.7;
export const PUPIL_R_WIDE = 2.7;
export const NOSE = { x: HUB.x, y: HUB.y, r: 3 } as const;
export const CHEEKS = [
  { x: bottomLeft.x, y: bottomLeft.y, r: 2.2 },
  { x: bottomRight.x, y: bottomRight.y, r: 2.2 },
] as const;
/** The logo's hub-to-node connectors, from the nose edge to each cheek edge. */
export const FACE_NETWORK_PATH = "M29.9 33.6L24.3 39.2M34.1 33.6L39.7 39.2";
/** A small smile. Identical in every expression. */
export const MOUTH_PATH = "M29.2 45.4Q32 47.8 34.8 45.4";
/** Closed "happy" eyes (celebrating): an upward arc over each eye, relative to its centre. */
export const HAPPY_EYE_PATH = "M-5 1.5Q0 -5 5 1.5";

/** Antenna: from the shield apex up to its light, in shield-grid units. */
export const ANTENNA = { base: { x: 32, y: 7.5 }, tip: { x: 35, y: -1.5 }, light: { x: 35.6, y: -3.6, r: 2.6 } } as const;

/** Torso, belt and shoulder anchors, in viewBox units. */
export const BODY_PATH =
  "M82 158C82 153 88 150 100 150C112 150 118 153 118 158L121 184C121 189 115 192 100 192C85 192 79 189 79 184Z";
export const BELT_PATH = "M80 179C90 183 110 183 120 179";
export const SHOULDERS = [
  { x: 81, y: 160 },
  { x: 119, y: 160 },
] as const;
export const HIPS = [
  { x: 90, y: 188 },
  { x: 110, y: 188 },
] as const;

/** Limbs are outlined tubes: a wide line-colour stroke under a narrower body-colour stroke. */
export const ARM_OUTLINE = 15;
export const ARM_FILL = 9;
export const LEG_OUTLINE = 16;
export const LEG_FILL = 10;
export const JOINT_R = { shoulder: 5, elbow: 4.2, knee: 4.2 } as const;

/**
 * The mitten hand, used in every pose except presenting. Origin is the wrist; fingers point up
 * (−y) with the thumb to the right. Rotate and mirror it per pose.
 */
export const HAND_PATH =
  "M-7 0C-10 -6 -9 -15 -2 -17C2 -18 6 -16 7 -12L9 -15C11 -17 14 -16 14 -13C14 -9 11 -5 8 -1C5 3 -4 4 -7 0Z";

/**
 * The pointing hand, used only by the presenting pose. Same wrist origin; the index finger points
 * up (−y) from a closed fist.
 */
export const POINTING_HAND_PATH =
  "M-7 0C-10 -5 -9 -11 -4 -13L-1 -13.5V-24C-1 -27 4 -27 4 -24V-13C8 -12 10 -8 9 -4C8 1 -3 3 -7 0Z";

/** Boot, relative to the ankle; mirrored for the right foot. */
export const BOOT_PATH = "M-14 16C-14 7 -8 2 0 2C8 2 12 7 12 16Z";

/**
 * Fixed brand colours: the mascot looks the same in light and dark themes (like the `screen`
 * panel). Components use the `--color-mascot-*` tokens; static SVG exports use these hex values.
 * A test keeps them in sync with `src/app/theme.css`.
 */
export const MASCOT_HEX = {
  body: "#122B52",
  line: "#00C2FF",
  pupil: "#041937",
  shine: "#FFFFFF",
  alert: "#FF7A7A",
} as const;

export type MascotPalette = Record<keyof typeof MASCOT_HEX, string>;

export const MASCOT_TOKENS: MascotPalette = {
  body: "var(--color-mascot-body)",
  line: "var(--color-mascot-line)",
  pupil: "var(--color-mascot-pupil)",
  shine: "var(--color-mascot-shine)",
  alert: "var(--color-mascot-alert)",
};
