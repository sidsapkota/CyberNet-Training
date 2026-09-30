/**
 * Scenes: generic device illustrations whose parts can be tapped (hotspot) or taken apart
 * (teardown). This file is the pure half: part ids, accessible names, hit boxes and draw order.
 * The drawings live in `art.tsx`. Card schemas validate part ids against these manifests, so it
 * must stay free of React. Devices are deliberately generic: no brands, logos or real designs.
 *
 * To add a scene: add its manifest here and its drawing in art.tsx (keyed by the same id).
 */

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
}

export interface SceneManifest {
  id: string;
  /** What the illustration shows, for screen readers. */
  description: string;
  width: number;
  height: number;
  /** Parts in draw order: back to front. */
  parts: ScenePart[];
  /** Named starting states: the parts hidden in each (e.g. "open" = cover off). */
  views: Record<string, string[]>;
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
    description: "The underside of a generic laptop. With the bottom panel off you can see the parts inside.",
    width: 320,
    height: 220,
    parts: [
      { id: "motherboard", name: "Motherboard", box: { x: 32, y: 32, w: 160, h: 156 }, coveredBy: "panel" },
      { id: "cpu", name: "CPU (processor)", box: { x: 48, y: 44, w: 44, h: 44 }, exit: { x: 0, y: -60 }, coveredBy: "panel" },
      { id: "fan", name: "Cooling fan", box: { x: 114, y: 40, w: 52, h: 52 }, exit: { x: 0, y: -60 }, coveredBy: "panel" },
      { id: "ram", name: "RAM (memory)", box: { x: 42, y: 104, w: 76, h: 28 }, exit: { x: -70, y: 0 }, coveredBy: "panel" },
      { id: "storage", name: "Storage drive (SSD)", box: { x: 120, y: 106, w: 64, h: 30 }, exit: { x: 0, y: 60 }, coveredBy: "panel" },
      { id: "battery", name: "Battery", box: { x: 202, y: 34, w: 88, h: 152 }, exit: { x: 70, y: 0 }, coveredBy: "panel" },
      { id: "battery-connector", name: "Battery connector", box: { x: 182, y: 96, w: 30, h: 22 }, exit: { x: 6, y: -8 }, coveredBy: "panel" },
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
    description: "The back of a generic smartphone. With the back cover off you can see the parts inside.",
    width: 200,
    height: 320,
    parts: [
      { id: "logic-board", name: "Logic board (motherboard)", box: { x: 30, y: 20, w: 140, h: 92 }, coveredBy: "back-cover" },
      { id: "camera", name: "Camera", box: { x: 38, y: 28, w: 36, h: 36 }, exit: { x: -50, y: 0 }, coveredBy: "back-cover" },
      { id: "cpu", name: "CPU (processor)", box: { x: 84, y: 28, w: 38, h: 38 }, coveredBy: "back-cover" },
      { id: "ram", name: "RAM (memory)", box: { x: 122, y: 30, w: 34, h: 30 }, coveredBy: "back-cover" },
      { id: "storage", name: "Storage chip", box: { x: 122, y: 66, w: 38, h: 30 }, coveredBy: "back-cover" },
      { id: "battery", name: "Battery", box: { x: 34, y: 126, w: 132, h: 144 }, exit: { x: 0, y: 60 }, coveredBy: "back-cover" },
      { id: "battery-connector", name: "Battery connector", box: { x: 84, y: 104, w: 32, h: 22 }, exit: { x: 0, y: -10 }, coveredBy: "back-cover" },
      { id: "speaker", name: "Speaker", box: { x: 32, y: 282, w: 34, h: 20 }, coveredBy: "back-cover" },
      { id: "charging-port", name: "Charging port", box: { x: 76, y: 298, w: 48, h: 20 } },
      { id: "back-cover", name: "Back cover", box: { x: 26, y: 14, w: 148, h: 292 }, exit: { x: 0, y: -40 } },
      screw("screw-1", "Left screw", 44, 296),
      screw("screw-2", "Right screw", 156, 296),
    ],
    views: {
      closed: [],
      open: ["back-cover", "screw-1", "screw-2"],
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
      { id: "file-holiday", name: "holiday.jpg", box: { x: 96, y: 36, w: 212, h: 26 } },
      { id: "file-song", name: "song.mp3", box: { x: 96, y: 64, w: 212, h: 26 } },
      { id: "file-essay", name: "essay.docx", box: { x: 96, y: 92, w: 212, h: 26 } },
      { id: "file-fake-photo", name: "photo.jpg.exe", box: { x: 96, y: 120, w: 212, h: 26 } },
      { id: "file-notes", name: "notes.txt", box: { x: 96, y: 148, w: 212, h: 26 } },
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
