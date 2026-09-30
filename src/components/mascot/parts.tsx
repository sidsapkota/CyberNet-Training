import type { ReactNode } from "react";
import {
  ANTENNA,
  ARM_FILL,
  ARM_OUTLINE,
  BELT_PATH,
  BODY_PATH,
  BOOT_PATH,
  CHEEKS,
  EYE_R,
  EYE_R_WIDE,
  EYES,
  FACE_NETWORK_PATH,
  HAND_PATH,
  HAPPY_EYE_PATH,
  HEAD,
  HEAD_SHIELD_PATH,
  HIPS,
  JOINT_R,
  LEG_FILL,
  LEG_OUTLINE,
  type MascotPalette,
  MOUTH_PATH,
  NOSE,
  POINTING_HAND_PATH,
  PUPIL_R,
  PUPIL_R_WIDE,
  SHOULDERS,
} from "./geometry";
import type { ArmPose, MascotPose } from "./poses";

/*
 * The mascot's parts as plain SVG (no hooks, no motion), so the live component and the static
 * SVG export draw exactly the same character. <Mascot> adds motion through the `slots` below.
 */

export interface MascotSlots {
  /** Wraps both eyes (for blinking). */
  eyes?: (children: ReactNode) => ReactNode;
  /** Wraps the antenna light (for the mood pulse). */
  antennaLight?: (children: ReactNode) => ReactNode;
  /** Wraps an arm, 0 = left, 1 = right (for the wave). */
  arm?: (index: 0 | 1, children: ReactNode) => ReactNode;
}

interface PartProps {
  pose: MascotPose;
  palette: MascotPalette;
  /** id of the glow filter defined by the root <svg>. */
  glow: string;
}

const identity = (children: ReactNode) => children;
type Point = { x: number; y: number };
const pts = (...points: Point[]) => points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join("");

function tone({ pose, palette }: PartProps) {
  return pose.tone === "alert" ? palette.alert : palette.line;
}

function Joint({ at, r, fill, glow }: { at: Point; r: number; fill: string; glow: string }) {
  return <circle cx={at.x} cy={at.y} r={r} fill={fill} filter={`url(#${glow})`} />;
}

/** Outlined tube: a wide outline stroke under a narrower body stroke. */
function Tube({ d, outline, fill, palette }: { d: string; outline: number; fill: number; palette: MascotPalette }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={palette.line} strokeWidth={outline} />
      <path d={d} stroke={palette.body} strokeWidth={fill} />
    </g>
  );
}

export function Legs(props: PartProps) {
  const { pose, palette, glow } = props;
  const legs =
    pose.legs === "hop"
      ? [
          { knee: { x: 81, y: 197 }, ankle: { x: 85, y: 205 } },
          { knee: { x: 119, y: 197 }, ankle: { x: 115, y: 205 } },
        ]
      : [
          { knee: { x: 89, y: 198 }, ankle: { x: 88, y: 206 } },
          { knee: { x: 111, y: 198 }, ankle: { x: 112, y: 206 } },
        ];
  return (
    <g>
      {legs.map((leg, i) => (
        <g key={i}>
          <Tube d={pts(HIPS[i]!, leg.knee, leg.ankle)} outline={LEG_OUTLINE} fill={LEG_FILL} palette={palette} />
          <path
            d={BOOT_PATH}
            transform={`translate(${leg.ankle.x} ${leg.ankle.y})${i === 1 ? " scale(-1 1)" : ""}`}
            fill={palette.body}
            stroke={palette.line}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Joint at={leg.knee} r={JOINT_R.knee} fill={tone(props)} glow={glow} />
        </g>
      ))}
    </g>
  );
}

export function Arm(props: PartProps & { index: 0 | 1; arm: ArmPose }) {
  const { arm, index, palette, glow } = props;
  const shoulder = SHOULDERS[index];
  return (
    <g>
      <Tube d={pts(shoulder, arm.elbow, arm.wrist)} outline={ARM_OUTLINE} fill={ARM_FILL} palette={palette} />
      <path
        d={arm.pointing ? POINTING_HAND_PATH : HAND_PATH}
        transform={`translate(${arm.wrist.x} ${arm.wrist.y}) rotate(${arm.handAngle})${arm.flip ? " scale(-1 1)" : ""}`}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Joint at={arm.elbow} r={JOINT_R.elbow} fill={tone(props)} glow={glow} />
      {arm.front && <Joint at={shoulder} r={JOINT_R.shoulder} fill={tone(props)} glow={glow} />}
    </g>
  );
}

export function Body(props: PartProps) {
  const { palette, glow } = props;
  return (
    <g>
      <path d={BODY_PATH} fill={palette.body} stroke={palette.line} strokeWidth={3} strokeLinejoin="round" />
      <path d={BELT_PATH} fill="none" stroke={palette.line} strokeWidth={3} strokeLinecap="round" />
      {SHOULDERS.map((s, i) => (
        <Joint key={i} at={s} r={JOINT_R.shoulder} fill={tone(props)} glow={glow} />
      ))}
    </g>
  );
}

export function Eyes({ pose, palette }: PartProps) {
  if (pose.eyes === "happy") {
    return (
      <g fill="none" stroke={palette.line} strokeWidth={2.2} strokeLinecap="round">
        {EYES.map((eye, i) => (
          <path key={i} d={HAPPY_EYE_PATH} transform={`translate(${eye.x} ${eye.y})`} />
        ))}
      </g>
    );
  }
  const wide = pose.eyes === "wide";
  const eyeR = wide ? EYE_R_WIDE : EYE_R;
  const pupilR = wide ? PUPIL_R_WIDE : PUPIL_R;
  return (
    <g>
      {EYES.map((eye, i) => {
        const look = pose.pupils[i as 0 | 1];
        const px = eye.x + look.x;
        const py = eye.y + look.y;
        return (
          <g key={i}>
            <circle cx={eye.x} cy={eye.y} r={eyeR} fill={palette.line} />
            <circle cx={px} cy={py} r={pupilR} fill={palette.pupil} />
            <circle cx={px + pupilR * 0.38} cy={py - pupilR * 0.4} r={wide ? 0.95 : 1.25} fill={palette.shine} />
          </g>
        );
      })}
    </g>
  );
}

export function Antenna({ pose, palette, glow, slot }: PartProps & { slot: (c: ReactNode) => ReactNode }) {
  const color = pose.antenna === "alert" ? palette.alert : palette.line;
  const r = pose.antenna === "bright" ? ANTENNA.light.r + 0.5 : ANTENNA.light.r;
  return (
    <g>
      <path
        d={pts(ANTENNA.base, ANTENNA.tip)}
        stroke={palette.line}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {slot(
        <circle
          cx={ANTENNA.light.x}
          cy={ANTENNA.light.y}
          r={r}
          fill={color}
          opacity={pose.antenna === "dim" ? 0.45 : 1}
          filter={`url(#${glow})`}
        />,
      )}
    </g>
  );
}

export function Head(props: PartProps & { slots: MascotSlots }) {
  const { pose, palette, glow, slots } = props;
  const face = tone(props);
  return (
    <g transform={`translate(${HEAD.x} ${HEAD.y}) rotate(${pose.tilt}) scale(${HEAD.scale}) translate(-32 -32)`}>
      <Antenna {...props} slot={slots.antennaLight ?? identity} />
      <path d={HEAD_SHIELD_PATH} fill={palette.body} stroke={palette.line} strokeWidth={2.6} strokeLinejoin="round" />
      <path d={FACE_NETWORK_PATH} stroke={face} strokeWidth={0.9} strokeLinecap="round" opacity={0.8} fill="none" />
      <circle cx={NOSE.x} cy={NOSE.y} r={NOSE.r} fill={face} />
      {CHEEKS.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={face} filter={`url(#${glow})`} />
      ))}
      {(slots.eyes ?? identity)(<Eyes pose={pose} palette={palette} glow={glow} />)}
      <path d={MOUTH_PATH} fill="none" stroke={palette.line} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

/** The whole character, back to front. Needs a glow filter with id `glow` in the root <svg>. */
export function MascotFigure({ pose, palette, glow, slots = {} }: PartProps & { slots?: MascotSlots }) {
  const wrapArm = slots.arm ?? ((_: 0 | 1, children: ReactNode) => children);
  const arm = (index: 0 | 1) =>
    wrapArm(index, <Arm pose={pose} palette={palette} glow={glow} index={index} arm={pose.arms[index]} />);
  const back = ([0, 1] as const).filter((i) => !pose.arms[i].front);
  const front = ([0, 1] as const).filter((i) => pose.arms[i].front);
  return (
    <g>
      <Legs pose={pose} palette={palette} glow={glow} />
      {back.map((i) => (
        <g key={i}>{arm(i)}</g>
      ))}
      <Body pose={pose} palette={palette} glow={glow} />
      <Head pose={pose} palette={palette} glow={glow} slots={slots} />
      {front.map((i) => (
        <g key={i}>{arm(i)}</g>
      ))}
    </g>
  );
}

/** The glow used by joints, cheeks and the antenna light. */
export function GlowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation={2.2} result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
