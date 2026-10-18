/**
 * Scenes: generic device illustrations whose parts can be tapped (hotspot) or taken apart
 * (teardown). This file is the pure half: part ids, accessible names, hit boxes and draw order.
 * The drawings live in `art.tsx`. Card schemas validate part ids against these manifests, so it
 * must stay free of React. Devices are deliberately generic: no brands, logos or real designs.
 *
 * To add a scene: add its manifest here and its drawing in art.tsx (keyed by the same id).
 * Self-labelled scam scenes are data in textScenes.ts, which both files draw from.
 */

import {
  EMAIL_FROZEN_SCENE,
  EMAIL_PAYMENT_SCENE,
  EMAIL_SCENE,
  FAKE_WEBSITE_SCENE,
  PHONE_CALL_SCENE,
  TEXT_MESSAGE_SCENE,
  TEXT_TOLLS_SCENE,
  type TextScene,
} from "./textScenes";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScenePart {
  id: string;
  /** Accessible name, and the default label in the dev playground. */
  name: string;
  /** Tap target, in viewBox units. Rendered at least 44px on screen. */
  box: Box;
  /** Where a removed part moves to (teardown), in viewBox units. */
  exit?: { x: number; y: number };
  /** The part covering this one; it can't be seen or tapped until that part is off. */
  coveredBy?: string;
  /**
   * Where a label-mode marker sits, in viewBox units, when the centre would hide something: a file
   * name, or the clue that identifies a part (the CPU's lid, RAM's chips, storage's stripes).
   */
  labelAt?: { x: number; y: number };
}

export interface SceneManifest {
  id: string;
  /** What the illustration shows, for screen readers. */
  description: string;
  /** A device diagram: shows a "Simplified diagram" label (real layouts vary; photos show the real thing). */
  simplified?: boolean;
  width: number;
  height: number;
  /** Parts in draw order: back to front. */
  parts: ScenePart[];
  /** Named starting states: the parts hidden in each (e.g. "open" = cover off). */
  views: Record<string, string[]>;
}

/** A self-labelled scene's manifest, from its drawing data (textScenes.ts). */
function fromText(scene: TextScene): SceneManifest {
  return {
    id: scene.id,
    description: scene.description,
    width: scene.width,
    height: scene.height,
    parts: scene.parts.map(({ id, name, box, labelAt }) => (labelAt ? { id, name, box, labelAt } : { id, name, box })),
    views: { default: [] },
  };
}

const screw = (id: string, name: string, x: number, y: number): ScenePart => ({
  id,
  name,
  box: { x: x - 10, y: y - 10, w: 20, h: 20 },
  exit: { x: 0, y: -24 },
});

export const SCENES = {
  laptop: {
    id: "laptop",
    description:
      "Simplified diagram of the underside of a generic laptop, an example with removable RAM and an SSD. With the bottom panel off you can see the parts inside.",
    simplified: true,
    width: 320,
    height: 220,
    parts: [
      // labelAt: an empty patch of board below the CPU, clear of the fan, SSD, battery and connector spots.
      { id: "motherboard", name: "Motherboard", box: { x: 32, y: 30, w: 256, h: 86 }, labelAt: { x: 124, y: 103 }, coveredBy: "panel" },
      { id: "heat-pipe", name: "Heat pipe", box: { x: 30, y: 30, w: 82, h: 18 }, labelAt: { x: 60, y: 39 }, coveredBy: "panel" },
      { id: "fan", name: "Cooling fan", box: { x: 42, y: 52, w: 54, h: 54 }, labelAt: { x: 46, y: 56 }, exit: { x: 0, y: -60 }, coveredBy: "panel" },
      { id: "cpu", name: "CPU (processor)", box: { x: 118, y: 52, w: 36, h: 36 }, labelAt: { x: 121, y: 55 }, exit: { x: 0, y: -60 }, coveredBy: "panel" },
      { id: "ram", name: "RAM (memory)", box: { x: 192, y: 34, w: 88, h: 38 }, labelAt: { x: 196, y: 38 }, exit: { x: 70, y: 0 }, coveredBy: "panel" },
      { id: "storage", name: "Storage drive (SSD)", box: { x: 172, y: 80, w: 112, h: 28 }, labelAt: { x: 276, y: 84 }, exit: { x: 70, y: 0 }, coveredBy: "panel" },
      { id: "battery", name: "Battery", box: { x: 38, y: 124, w: 244, h: 64 }, labelAt: { x: 44, y: 130 }, exit: { x: 0, y: 70 }, coveredBy: "panel" },
      { id: "battery-connector", name: "Battery connector", box: { x: 144, y: 106, w: 32, h: 20 }, exit: { x: 0, y: -10 }, coveredBy: "panel" },
      { id: "panel", name: "Bottom panel", box: { x: 24, y: 24, w: 272, h: 172 }, exit: { x: 0, y: -40 } },
      screw("screw-1", "Top-left screw", 40, 40),
      screw("screw-2", "Top-right screw", 280, 40),
      screw("screw-3", "Bottom-left screw", 40, 180),
      screw("screw-4", "Bottom-right screw", 280, 180),
    ],
    views: {
      closed: [],
      open: ["panel", "screw-1", "screw-2", "screw-3", "screw-4"],
    },
  },
  phone: {
    id: "phone",
    description:
      "Simplified diagram of the back of a generic smartphone. With the glued back cover off you can see the parts inside: the battery takes up most of the space.",
    simplified: true,
    width: 200,
    height: 320,
    parts: [
      { id: "logic-board", name: "Logic board (motherboard)", box: { x: 30, y: 18, w: 140, h: 94 }, coveredBy: "back-cover" },
      { id: "camera", name: "Camera module", box: { x: 34, y: 24, w: 42, h: 42 }, labelAt: { x: 37, y: 27 }, exit: { x: -50, y: 0 }, coveredBy: "back-cover" },
      { id: "cpu", name: "Processor (CPU)", box: { x: 82, y: 26, w: 38, h: 38 }, labelAt: { x: 85, y: 29 }, coveredBy: "back-cover" },
      { id: "ram", name: "RAM chip (memory)", box: { x: 126, y: 26, w: 36, h: 30 }, labelAt: { x: 159, y: 29 }, coveredBy: "back-cover" },
      { id: "storage", name: "Storage chip", box: { x: 126, y: 60, w: 36, h: 30 }, labelAt: { x: 159, y: 87 }, coveredBy: "back-cover" },
      { id: "battery-connector", name: "Battery connector", box: { x: 88, y: 98, w: 28, h: 16 }, exit: { x: 0, y: -12 }, coveredBy: "back-cover" },
      { id: "connector-cover", name: "Connector bracket", box: { x: 74, y: 84, w: 56, h: 13 }, exit: { x: 0, y: -40 }, coveredBy: "back-cover" },
      { id: "battery", name: "Battery", box: { x: 36, y: 118, w: 112, h: 158 }, labelAt: { x: 42, y: 124 }, exit: { x: 0, y: 60 }, coveredBy: "back-cover" },
      { id: "flex-cable", name: "Ribbon cable", box: { x: 152, y: 112, w: 18, h: 168 }, labelAt: { x: 161, y: 196 }, coveredBy: "back-cover" },
      { id: "speaker", name: "Speaker", box: { x: 34, y: 282, w: 40, h: 16 }, coveredBy: "back-cover" },
      { id: "vibration-motor", name: "Vibration motor", box: { x: 80, y: 282, w: 28, h: 16 }, coveredBy: "back-cover" },
      { id: "charging-port", name: "Charging port", box: { x: 76, y: 298, w: 48, h: 20 } },
      // The bracket's screws sit under the glued back, so they're drawn before (beneath) it.
      { ...screw("screw-1", "Left bracket screw", 80, 90), coveredBy: "back-cover" },
      { ...screw("screw-2", "Right bracket screw", 124, 90), coveredBy: "back-cover" },
      { id: "back-cover", name: "Back cover", box: { x: 26, y: 14, w: 148, h: 292 }, exit: { x: 0, y: -40 } },
    ],
    views: {
      closed: [],
      open: ["back-cover"],
      // Back still glued on, but the bracket's two tiny screws already taken out (a shorter teardown).
      "bracket-unscrewed": ["screw-1", "screw-2"],
    },
  },
  "file-browser": {
    id: "file-browser",
    description: "A generic file browser window with folders on the left and files on the right.",
    width: 320,
    height: 200,
    parts: [
      { id: "folder-documents", name: "Documents folder", box: { x: 12, y: 36, w: 76, h: 22 } },
      { id: "folder-photos", name: "Photos folder", box: { x: 12, y: 60, w: 76, h: 22 } },
      { id: "folder-music", name: "Music folder", box: { x: 12, y: 84, w: 76, h: 22 } },
      { id: "folder-downloads", name: "Downloads folder", box: { x: 12, y: 108, w: 76, h: 22 } },
      { id: "file-holiday", name: "holiday.jpg", box: { x: 96, y: 36, w: 212, h: 26 }, labelAt: { x: 282, y: 49 } },
      { id: "file-song", name: "song.mp3", box: { x: 96, y: 64, w: 212, h: 26 }, labelAt: { x: 282, y: 77 } },
      { id: "file-essay", name: "essay.docx", box: { x: 96, y: 92, w: 212, h: 26 }, labelAt: { x: 282, y: 105 } },
      { id: "file-fake-photo", name: "photo.jpg.exe", box: { x: 96, y: 120, w: 212, h: 26 }, labelAt: { x: 282, y: 133 } },
      { id: "file-notes", name: "notes.txt", box: { x: 96, y: 148, w: 212, h: 26 }, labelAt: { x: 282, y: 161 } },
    ],
    views: { default: [] },
  },
  /*
   * Scam-spotting scenes (Stay Safe Online module 2), drawn from the data in textScenes.ts. Every
   * example is fictional and every address uses the reserved `.example` domain. Parts are the lines
   * a learner can tap; their names are exactly the text shown, so screen readers get the same clues.
   */
  email: fromText(EMAIL_SCENE),
  "email-frozen-card": fromText(EMAIL_FROZEN_SCENE),
  "email-payment": fromText(EMAIL_PAYMENT_SCENE),
  "text-message": fromText(TEXT_MESSAGE_SCENE),
  "text-message-tolls": fromText(TEXT_TOLLS_SCENE),
  "fake-website": fromText(FAKE_WEBSITE_SCENE),
  "phone-call": fromText(PHONE_CALL_SCENE),
  "home-screen": {
    id: "home-screen",
    description: "A phone's home screen with four apps: Game Club, Email, Music and Photos, each with a small padlock.",
    width: 320,
    height: 220,
    parts: [
      { id: "app-game-club", name: "Game Club", box: { x: 14, y: 56, w: 70, h: 112 } },
      { id: "app-email", name: "Email", box: { x: 90, y: 56, w: 70, h: 112 } },
      { id: "app-music", name: "Music", box: { x: 166, y: 56, w: 70, h: 112 } },
      { id: "app-photos", name: "Photos", box: { x: 242, y: 56, w: 70, h: 112 } },
    ],
    views: { default: [], "three-apps": ["app-photos"] },
  },
  "sign-in-options": {
    id: "sign-in-options",
    description: "An email app's Sign-in options screen with three choices: Text me a code, Authenticator app and Passkey.",
    width: 320,
    height: 236,
    parts: [
      { id: "option-text-code", name: "Text me a code", box: { x: 14, y: 62, w: 292, h: 50 } },
      { id: "option-authenticator", name: "Authenticator app", box: { x: 14, y: 118, w: 292, h: 50 } },
      { id: "option-passkey", name: "Passkey", box: { x: 14, y: 174, w: 292, h: 50 } },
    ],
    views: { default: [] },
  },
  "sign-in": {
    id: "sign-in",
    description: "An email sign-in page on a laptop with a password box and a code box, and a phone beside it showing a sign-in code.",
    width: 320,
    height: 210,
    parts: [
      { id: "sign-in-password", name: "Step 1: Password", box: { x: 12, y: 46, w: 196, h: 54 } },
      { id: "sign-in-code-box", name: "Step 2: Enter the code", box: { x: 12, y: 112, w: 196, h: 54 } },
      { id: "sign-in-phone", name: "Your sign-in code is 481 902", box: { x: 222, y: 30, w: 90, h: 160 } },
    ],
    views: { default: [] },
  },
} as const satisfies Record<string, SceneManifest>;

export type SceneId = keyof typeof SCENES;
export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

export function getScene(id: string): SceneManifest | undefined {
  return (SCENES as Record<string, SceneManifest>)[id];
}

export function scenePart(sceneId: string, partId: string): ScenePart | undefined {
  return getScene(sceneId)?.parts.find((p) => p.id === partId);
}

/** Parts hidden at the start of a view ("open" = cover already off). Unknown views hide nothing. */
export function hiddenInView(sceneId: string, view: string | undefined): string[] {
  const scene = getScene(sceneId);
  if (!scene || !view) return [];
  return scene.views[view] ?? [];
}

/** Parts that can be seen: not hidden, and not under a cover that's still on. */
export function visibleParts(sceneId: string, hidden: ReadonlySet<string>): ScenePart[] {
  const scene = getScene(sceneId);
  if (!scene) return [];
  return scene.parts.filter((p) => !hidden.has(p.id) && (!p.coveredBy || hidden.has(p.coveredBy)));
}
