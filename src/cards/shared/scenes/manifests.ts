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
      { id: "cpu", name: "CPU (processor)", box: { x: 48, y: 44, w: 44, h: 44 }, labelAt: { x: 47, y: 43 }, exit: { x: 0, y: -60 }, coveredBy: "panel" },
      { id: "fan", name: "Cooling fan", box: { x: 114, y: 40, w: 52, h: 52 }, labelAt: { x: 116, y: 42 }, exit: { x: 0, y: -60 }, coveredBy: "panel" },
      { id: "ram", name: "RAM (memory)", box: { x: 42, y: 104, w: 76, h: 28 }, labelAt: { x: 44, y: 106 }, exit: { x: -70, y: 0 }, coveredBy: "panel" },
      { id: "storage", name: "Storage drive (SSD)", box: { x: 120, y: 106, w: 64, h: 30 }, labelAt: { x: 182, y: 108 }, exit: { x: 0, y: 60 }, coveredBy: "panel" },
      { id: "battery", name: "Battery", box: { x: 202, y: 34, w: 88, h: 152 }, labelAt: { x: 206, y: 38 }, exit: { x: 70, y: 0 }, coveredBy: "panel" },
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
      { id: "camera", name: "Camera", box: { x: 38, y: 28, w: 36, h: 36 }, labelAt: { x: 40, y: 30 }, exit: { x: -50, y: 0 }, coveredBy: "back-cover" },
      { id: "cpu", name: "CPU (processor)", box: { x: 84, y: 28, w: 38, h: 38 }, labelAt: { x: 88, y: 30 }, coveredBy: "back-cover" },
      { id: "ram", name: "RAM (memory)", box: { x: 122, y: 30, w: 34, h: 30 }, labelAt: { x: 156, y: 31 }, coveredBy: "back-cover" },
      { id: "storage", name: "Storage chip", box: { x: 122, y: 66, w: 38, h: 30 }, labelAt: { x: 158, y: 94 }, coveredBy: "back-cover" },
      { id: "battery", name: "Battery", box: { x: 34, y: 126, w: 132, h: 144 }, labelAt: { x: 40, y: 131 }, exit: { x: 0, y: 60 }, coveredBy: "back-cover" },
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
      { id: "file-holiday", name: "holiday.jpg", box: { x: 96, y: 36, w: 212, h: 26 }, labelAt: { x: 282, y: 49 } },
      { id: "file-song", name: "song.mp3", box: { x: 96, y: 64, w: 212, h: 26 }, labelAt: { x: 282, y: 77 } },
      { id: "file-essay", name: "essay.docx", box: { x: 96, y: 92, w: 212, h: 26 }, labelAt: { x: 282, y: 105 } },
      { id: "file-fake-photo", name: "photo.jpg.exe", box: { x: 96, y: 120, w: 212, h: 26 }, labelAt: { x: 282, y: 133 } },
      { id: "file-notes", name: "notes.txt", box: { x: 96, y: 148, w: 212, h: 26 }, labelAt: { x: 282, y: 161 } },
    ],
    views: { default: [] },
  },
  /*
   * Scam-spotting scenes (Stay Safe Online). Every example is fictional: "Your Bank" and "Parcels"
   * are made-up names, and every address uses the reserved `.example` domain, so none of it can
   * point at a real organisation or a real website. Parts are the lines a learner can tap; their
   * names are exactly the text shown, so screen readers get the same clues and no extra hints.
   */
  email: {
    id: "email",
    description: "An email open in a mail app: sender, subject, message and a button.",
    width: 320,
    height: 236,
    parts: [
      { id: "email-from", name: "From: Your Bank <security@yourbank-help.example>", box: { x: 10, y: 36, w: 300, h: 18 }, labelAt: { x: 296, y: 45 } },
      { id: "email-date", name: "Received today at 3:12 am", box: { x: 10, y: 56, w: 300, h: 16 }, labelAt: { x: 296, y: 64 } },
      { id: "email-subject", name: "Subject: URGENT: Your account will be closed in 24 hours", box: { x: 10, y: 76, w: 300, h: 20 }, labelAt: { x: 296, y: 86 } },
      { id: "email-greeting", name: "Dear Customer,", box: { x: 10, y: 102, w: 300, h: 16 }, labelAt: { x: 296, y: 110 } },
      {
        id: "email-secrets",
        name: "We noticed unusual activity on your account. To keep it open, reply with your password and your card number.",
        box: { x: 10, y: 120, w: 300, h: 30 },
        labelAt: { x: 296, y: 135 },
      },
      { id: "email-link", name: "Button: Verify my account. The link goes to yourbank-verify.example", box: { x: 10, y: 156, w: 300, h: 44 }, labelAt: { x: 296, y: 178 } },
      { id: "email-signoff", name: "Thanks, the Security Team", box: { x: 10, y: 206, w: 300, h: 22 }, labelAt: { x: 296, y: 217 } },
    ],
    views: { default: [] },
  },
  "text-message": {
    id: "text-message",
    description: "A text message thread from a sender named Parcels, with an older message and a new one.",
    width: 200,
    height: 320,
    parts: [
      { id: "sms-sender", name: "Sender name: Parcels", box: { x: 34, y: 30, w: 132, h: 26 }, labelAt: { x: 154, y: 43 } },
      { id: "sms-earlier", name: "Monday: Your parcel is on its way. Track it in the Parcels app.", box: { x: 28, y: 76, w: 144, h: 50 }, labelAt: { x: 162, y: 100 } },
      { id: "sms-time", name: "Today, 7:41 pm", box: { x: 60, y: 136, w: 80, h: 16 }, labelAt: { x: 132, y: 144 } },
      { id: "sms-fee", name: "We tried to deliver your parcel. Pay a $1.95 fee", box: { x: 28, y: 160, w: 144, h: 28 }, labelAt: { x: 162, y: 175 } },
      { id: "sms-deadline", name: "within 2 hours, or it goes back:", box: { x: 28, y: 188, w: 144, h: 14 }, labelAt: { x: 162, y: 195 } },
      { id: "sms-link", name: "Link: parcels-redelivery.example/pay", box: { x: 28, y: 204, w: 144, h: 18 }, labelAt: { x: 162, y: 212 } },
    ],
    views: { default: [] },
  },
  "fake-website": {
    id: "fake-website",
    description: "A web browser showing a sign-in page for a bank called Your Bank.",
    width: 320,
    height: 236,
    parts: [
      { id: "site-padlock", name: "Padlock icon", box: { x: 12, y: 30, w: 22, h: 22 } },
      { id: "site-address", name: "Address: https://yourbank.example.login-check.example/signin", box: { x: 36, y: 30, w: 274, h: 22 }, labelAt: { x: 298, y: 41 } },
      { id: "site-logo", name: "Your Bank", box: { x: 12, y: 62, w: 130, h: 26 }, labelAt: { x: 132, y: 75 } },
      { id: "site-banner", name: "Your account is locked! Sign in within 10 minutes to unlock it.", box: { x: 12, y: 94, w: 296, h: 24 }, labelAt: { x: 296, y: 106 } },
      { id: "site-username", name: "Box: Username", box: { x: 60, y: 124, w: 200, h: 24 }, labelAt: { x: 252, y: 136 } },
      { id: "site-password", name: "Box: Password", box: { x: 60, y: 152, w: 200, h: 24 }, labelAt: { x: 252, y: 164 } },
      { id: "site-pin", name: "Box: Card PIN", box: { x: 60, y: 180, w: 200, h: 24 }, labelAt: { x: 252, y: 192 } },
      { id: "site-footer", name: "Your Bank · Privacy · Help", box: { x: 12, y: 210, w: 296, h: 20 }, labelAt: { x: 296, y: 220 } },
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
