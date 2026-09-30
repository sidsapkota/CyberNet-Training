/**
 * One record per expression. Poses only move shared parts (arms, legs, eyes, pupils, head tilt,
 * antenna mood), so the character stays consistent. Coordinates are in the 200 × 232 viewBox;
 * pupil offsets are in the head's shield-grid units.
 */

export const MASCOT_EXPRESSIONS = ["happy", "thinking", "celebrating", "confused", "alert", "presenting"] as const;
export type MascotExpression = (typeof MASCOT_EXPRESSIONS)[number];

type Point = { x: number; y: number };

export interface ArmPose {
  elbow: Point;
  wrist: Point;
  /** Hand rotation in degrees; 0 = fingers up. */
  handAngle: number;
  /** Mirror the hand (thumb to the left). */
  flip?: boolean;
  /** Draw this arm in front of the head (e.g. hand to chin). */
  front?: boolean;
  /** The pointing hand instead of the mitten (presenting only). */
  pointing?: boolean;
}

export interface MascotPose {
  /** Head tilt in degrees (negative leans left). */
  tilt: number;
  eyes: "open" | "wide" | "happy";
  /** Pupil offset for each eye, shield-grid units. */
  pupils: [Point, Point];
  arms: [left: ArmPose, right: ArmPose];
  legs: "stand" | "hop";
  /** Antenna light: steady, dimmed (thinking), bright (celebrating), flicker (confused), alert. */
  antenna: "steady" | "dim" | "bright" | "flicker" | "alert";
  /** Face nodes, joints and antenna colour. */
  tone: "cyan" | "alert";
}

const restLeft: ArmPose = { elbow: { x: 70, y: 172 }, wrist: { x: 73, y: 185 }, handAngle: 190, flip: true };
const restRight: ArmPose = { elbow: { x: 130, y: 172 }, wrist: { x: 127, y: 185 }, handAngle: 170 };
const lookUp = { x: 1.2, y: -0.8 };

export const MASCOT_POSES: Record<MascotExpression, MascotPose> = {
  happy: {
    tilt: -7,
    eyes: "open",
    pupils: [lookUp, lookUp],
    arms: [{ elbow: { x: 58, y: 152 }, wrist: { x: 45, y: 131 }, handAngle: -25 }, restRight],
    legs: "stand",
    antenna: "steady",
    tone: "cyan",
  },
  thinking: {
    tilt: 8,
    eyes: "open",
    pupils: [
      { x: 1.8, y: -1.9 },
      { x: 1.8, y: -1.9 },
    ],
    arms: [restLeft, { elbow: { x: 138, y: 168 }, wrist: { x: 126, y: 149 }, handAngle: -35, flip: true, front: true }],
    legs: "stand",
    antenna: "dim",
    tone: "cyan",
  },
  celebrating: {
    tilt: -4,
    eyes: "happy",
    pupils: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    arms: [
      { elbow: { x: 60, y: 146 }, wrist: { x: 44, y: 125 }, handAngle: -32 },
      { elbow: { x: 140, y: 146 }, wrist: { x: 156, y: 125 }, handAngle: 32, flip: true },
    ],
    legs: "hop",
    antenna: "bright",
    tone: "cyan",
  },
  confused: {
    tilt: 12,
    eyes: "open",
    pupils: [
      { x: -1.6, y: 0.6 },
      { x: 1.6, y: -1.2 },
    ],
    arms: [
      { elbow: { x: 62, y: 156 }, wrist: { x: 49, y: 143 }, handAngle: -70 },
      { elbow: { x: 138, y: 156 }, wrist: { x: 151, y: 143 }, handAngle: 70, flip: true },
    ],
    legs: "stand",
    antenna: "flicker",
    tone: "cyan",
  },
  alert: {
    tilt: 0,
    eyes: "wide",
    pupils: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    arms: [
      { elbow: { x: 66, y: 168 }, wrist: { x: 60, y: 152 }, handAngle: -10 },
      { elbow: { x: 134, y: 168 }, wrist: { x: 140, y: 152 }, handAngle: 10, flip: true },
    ],
    legs: "stand",
    antenna: "alert",
    tone: "alert",
  },
  presenting: {
    tilt: -5,
    eyes: "open",
    pupils: [
      { x: 2, y: 0.2 },
      { x: 2, y: 0.2 },
    ],
    arms: [restLeft, { elbow: { x: 142, y: 155 }, wrist: { x: 163, y: 149 }, handAngle: 80, pointing: true }],
    legs: "stand",
    antenna: "steady",
    tone: "cyan",
  },
};

/** Spoken description for each expression, used when a mascot isn't purely decorative. */
export const MASCOT_LABELS: Record<MascotExpression, string> = {
  happy: "Mascot waving hello",
  thinking: "Mascot thinking",
  celebrating: "Mascot celebrating",
  confused: "Mascot looking confused",
  alert: "Mascot on alert",
  presenting: "Mascot pointing the way",
};
