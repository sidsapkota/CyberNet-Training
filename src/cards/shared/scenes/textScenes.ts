/**
 * Self-labelled scam scenes (Stay Safe Online module 2): emails, text threads, a fake sign-in page
 * and a phone call. Pure data: each part is a list of simple drawing elements (text, boxes, paths)
 * plus its tap box, so manifests.ts can build the parts and art.tsx can draw them from one source.
 *
 * Drawn at 1 unit = 1px or larger (the scenes are in SceneStage's READABLE set), with every text
 * at 15 units or more, so it reads at about 15px on a 360px phone. Every example is fictional:
 * "Your Bank", "Parcels" and "Road Tolls" are made up, and every address uses the reserved
 * `.example` domain. Each part's name is exactly the text it shows.
 */

export type Tone = "ink" | "muted" | "warn" | "good" | "bg" | "edge" | "panel" | "shell" | "part" | "none";

export type El =
  | { t: "text"; x: number; y: number; s: number; text: string; w?: number; mono?: boolean; tone?: Tone; anchor?: "start" | "middle" | "end"; underline?: boolean }
  | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; fill?: Tone; stroke?: Tone; sw?: number; dash?: string }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: Tone; stroke?: Tone; sw?: number }
  | { t: "path"; d: string; fill?: Tone; stroke?: Tone; sw?: number };

export interface TextScenePart {
  id: string;
  name: string;
  box: { x: number; y: number; w: number; h: number };
  labelAt?: { x: number; y: number };
  els: El[];
}

export interface TextScene {
  id: string;
  description: string;
  width: number;
  height: number;
  base: El[];
  parts: TextScenePart[];
}

const W = 320;
const text = (x: number, y: number, s: number, value: string, more: Partial<Extract<El, { t: "text" }>> = {}): El => ({ t: "text", x, y, s, text: value, ...more });

/* ── Emails ────────────────────────────────────────────────────────────────────────────── */

interface EmailSpec {
  id: string;
  description: string;
  from: { name: string; address: string };
  date: string;
  subject: string[];
  greeting?: string;
  message: string[];
  button: { label: string; goesTo: string };
  signoff: string;
}

/** One email, laid out top to bottom. Part ids are shared, so cards read the same in every email. */
function email(spec: EmailSpec): TextScene {
  const parts: TextScenePart[] = [];
  let y = 8;
  parts.push({
    id: "email-from",
    name: `From: ${spec.from.name}, ${spec.from.address}`,
    box: { x: 8, y, w: 304, h: 42 },
    labelAt: { x: 296, y: y + 34 },
    els: [
      text(16, y + 18, 16, "From:", { tone: "muted" }),
      text(62, y + 18, 16, spec.from.name, { w: 600 }),
      text(16, y + 38, 15, spec.from.address, { mono: true, tone: "muted" }),
    ],
  });
  parts.push({
    id: "email-date",
    name: spec.date,
    box: { x: 206, y: y + 2, w: 90, h: 22 },
    els: [text(290, y + 18, 15, spec.date, { tone: "muted", anchor: "end" })],
  });
  y += 46;
  const subjectH = spec.subject.length * 20 + 4;
  parts.push({
    id: "email-subject",
    name: `Subject: ${spec.subject.join(" ")}`,
    box: { x: 8, y, w: 304, h: subjectH },
    labelAt: { x: 296, y: y + subjectH / 2 },
    els: spec.subject.map((line, i) => text(16, y + 17 + i * 20, 16, line, { w: 600 })),
  });
  y += subjectH;
  if (spec.greeting) {
    parts.push({
      id: "email-greeting",
      name: spec.greeting,
      box: { x: 8, y, w: 304, h: 24 },
      labelAt: { x: 296, y: y + 12 },
      els: [text(16, y + 17, 16, spec.greeting)],
    });
    y += 24;
  }
  const messageH = spec.message.length * 20 + 4;
  parts.push({
    id: "email-secrets",
    name: spec.message.join(" "),
    box: { x: 8, y, w: 304, h: messageH },
    labelAt: { x: 296, y: y + messageH / 2 },
    els: spec.message.map((line, i) => text(16, y + 16 + i * 20, 16, line)),
  });
  y += messageH + 4;
  const buttonW = Math.max(150, spec.button.label.length * 9 + 32);
  parts.push({
    id: "email-link",
    name: `${spec.button.label}. Goes to: ${spec.button.goesTo}`,
    box: { x: 8, y, w: 304, h: 52 },
    labelAt: { x: 296, y: y + 15 },
    els: [
      { t: "rect", x: 16, y, w: buttonW, h: 28, r: 6, fill: "edge" },
      text(16 + buttonW / 2, y + 19, 16, spec.button.label, { w: 600, tone: "bg", anchor: "middle" }),
      text(16, y + 46, 15, "Goes to:", { tone: "muted" }),
      text(80, y + 46, 15, spec.button.goesTo, { mono: true, tone: "muted" }),
    ],
  });
  y += 54;
  parts.push({
    id: "email-signoff",
    name: spec.signoff,
    box: { x: 8, y, w: 304, h: 24 },
    labelAt: { x: 296, y: y + 12 },
    els: [text(16, y + 17, 16, spec.signoff)],
  });
  y += 28;
  return {
    id: spec.id,
    description: spec.description,
    width: W,
    height: y,
    base: [
      { t: "rect", x: 2, y: 2, w: W - 4, h: y - 4, r: 12, fill: "panel", stroke: "edge", sw: 1.5 },
      { t: "path", d: "M10 52H310", stroke: "edge", sw: 0.75 },
    ],
    parts,
  };
}

export const EMAIL_SCENE = email({
  id: "email",
  description: "An email from Your Bank open on a phone: sender, time, subject, greeting, message, a button and a sign-off.",
  from: { name: "Your Bank", address: "security@yourbank-help.example" },
  date: "9:12 am",
  subject: ["URGENT: Your account will be", "closed in 24 hours"],
  greeting: "Dear Customer,",
  message: ["To keep your account open, reply", "with your password and card number."],
  button: { label: "Verify my account", goesTo: "yourbank-verify.example" },
  signoff: "Thanks, the Security Team",
});

export const EMAIL_FROZEN_SCENE = email({
  id: "email-frozen-card",
  description: "A second email from Your Bank: sender, time, subject, greeting, message, a button and a sign-off.",
  from: { name: "Your Bank", address: "alerts@yourbank-cards.example" },
  date: "Yesterday",
  subject: ["Card frozen! Act within 1 hour"],
  greeting: "Dear Valued Customer,",
  message: ["Type your card number and PIN", "on our page to unfreeze it."],
  button: { label: "Unfreeze my card", goesTo: "yourbank-unfreeze.example" },
  signoff: "Kind regards, Your Bank",
});

export const EMAIL_PAYMENT_SCENE = email({
  id: "email-payment",
  description: "An email from Your Bank about a failed payment: sender, time, subject, message, a button and a sign-off.",
  from: { name: "Your Bank", address: "help@yourbank-alerts.example" },
  date: "8:30 pm",
  subject: ["Payment failed: 3 hours left!"],
  message: ["Update your card to avoid a $50 fee."],
  button: { label: "Update my card", goesTo: "yourbank-update.example" },
  signoff: "The Your Bank Team",
});

/* ── Text threads ──────────────────────────────────────────────────────────────────────── */

interface ThreadSpec {
  id: string;
  description: string;
  sender: string;
  earlierDay: string;
  earlier: string[];
  time: string;
  fee: string[];
  deadline: string;
  link: string;
}

function thread(spec: ThreadSpec): TextScene {
  const parts: TextScenePart[] = [
    {
      id: "sms-sender",
      name: spec.sender,
      box: { x: 8, y: 8, w: 304, h: 34 },
      labelAt: { x: 296, y: 25 },
      els: [
        { t: "circle", cx: 46, cy: 25, r: 13, fill: "part", stroke: "edge", sw: 1.5 },
        text(46, 31, 16, spec.sender.charAt(0), { w: 600, anchor: "middle" }),
        text(68, 31, 17, spec.sender, { w: 600 }),
      ],
    },
    {
      id: "sms-earlier",
      name: `${spec.earlierDay}: ${spec.earlier.join(" ")}`,
      box: { x: 8, y: 50, w: 304, h: 70 },
      labelAt: { x: 290, y: 94 },
      els: [
        text(W / 2, 63, 15, spec.earlierDay, { tone: "muted", anchor: "middle" }),
        { t: "rect", x: 14, y: 69, w: 262, h: 48, r: 14, fill: "shell", stroke: "edge", sw: 1 },
        ...spec.earlier.map((line, i) => text(26, 88 + i * 20, 16, line)),
      ],
    },
    {
      id: "sms-time",
      name: spec.time,
      box: { x: 100, y: 122, w: 120, h: 22 },
      els: [text(W / 2, 138, 15, spec.time, { tone: "muted", anchor: "middle" })],
    },
    {
      id: "sms-fee",
      name: spec.fee.join(" "),
      box: { x: 8, y: 150, w: 304, h: 44 },
      labelAt: { x: 296, y: 172 },
      els: [
        { t: "rect", x: 14, y: 148, w: 292, h: 96, r: 14, fill: "part", stroke: "edge", sw: 1 },
        ...spec.fee.map((line, i) => text(26, 168 + i * 20, 16, line)),
      ],
    },
    {
      id: "sms-deadline",
      name: spec.deadline,
      box: { x: 8, y: 194, w: 304, h: 20 },
      labelAt: { x: 296, y: 204 },
      els: [text(26, 208, 16, spec.deadline)],
    },
    {
      id: "sms-link",
      name: spec.link,
      box: { x: 8, y: 215, w: 304, h: 24 },
      labelAt: { x: 296, y: 227 },
      els: [text(26, 232, 15, spec.link, { mono: true, underline: true })],
    },
  ];
  return {
    id: spec.id,
    description: spec.description,
    width: W,
    height: 252,
    base: [
      { t: "rect", x: 2, y: 2, w: W - 4, h: 248, r: 16, fill: "bg", stroke: "edge", sw: 1.5 },
      { t: "path", d: "M16 19L10 25L16 31", stroke: "muted", sw: 2 },
      { t: "path", d: "M10 46H310", stroke: "edge", sw: 0.75 },
    ],
    parts,
  };
}

export const TEXT_MESSAGE_SCENE = thread({
  id: "text-message",
  description: "A text message thread from a sender named Parcels, with an older message and a new one.",
  sender: "Parcels",
  earlierDay: "Monday",
  earlier: ["Your parcel is on its way.", "Track it in the Parcels app."],
  time: "Today, 7:41 pm",
  fee: ["We tried to deliver your parcel.", "Pay a $1.95 fee"],
  deadline: "within 2 hours, or it goes back:",
  link: "parcels-redelivery.example",
});

export const TEXT_TOLLS_SCENE = thread({
  id: "text-message-tolls",
  description: "A text message thread from a sender named Road Tolls, with an older message and a new one.",
  sender: "Road Tolls",
  earlierDay: "Tuesday",
  earlier: ["Thanks! Your toll is paid.", "See it in the Road Tolls app."],
  time: "Today, 10:02 am",
  fee: ["You have an unpaid toll.", "Pay a $3.40 late fee"],
  deadline: "within 12 hours, or get a fine:",
  link: "roadtolls-fines.example",
});

/* ── The fake sign-in page ─────────────────────────────────────────────────────────────── */

const field = (id: string, label: string, y: number): TextScenePart => ({
  id,
  name: label,
  box: { x: 40, y, w: 240, h: 30 },
  labelAt: { x: 268, y: y + 15 },
  els: [
    { t: "rect", x: 44, y: y + 2, w: 232, h: 27, r: 6, fill: "bg", stroke: "edge", sw: 1.2 },
    text(56, y + 21, 15, label, { tone: "muted" }),
  ],
});

export const FAKE_WEBSITE_SCENE: TextScene = {
  id: "fake-website",
  description: "A web browser on a phone showing a sign-in page that looks like Your Bank's.",
  width: W,
  height: 252,
  base: [
    { t: "rect", x: 2, y: 2, w: W - 4, h: 248, r: 12, fill: "panel", stroke: "edge", sw: 1.5 },
    { t: "path", d: "M2 46H318", stroke: "edge", sw: 0.75 },
  ],
  parts: [
    {
      id: "site-padlock",
      name: "Padlock",
      box: { x: 6, y: 10, w: 24, h: 30 },
      els: [
        { t: "rect", x: 10, y: 24, w: 16, h: 12, r: 2.5, fill: "ink" },
        { t: "path", d: "M13.5 24V21A4.5 4.5 0 0 1 22.5 21V24", stroke: "ink", sw: 2 },
      ],
    },
    {
      id: "site-address",
      name: "yourbank.example.login-check.example",
      box: { x: 32, y: 10, w: 284, h: 30 },
      labelAt: { x: 300, y: 25 },
      els: [
        { t: "rect", x: 32, y: 11, w: 284, h: 28, r: 14, fill: "bg", stroke: "edge", sw: 1 },
        text(40, 30, 15, "yourbank.example.login-check.example"),
      ],
    },
    {
      id: "site-logo",
      name: "Your Bank",
      box: { x: 8, y: 54, w: 180, h: 36 },
      labelAt: { x: 176, y: 72 },
      els: [
        { t: "rect", x: 16, y: 58, w: 28, h: 28, r: 7, fill: "edge" },
        { t: "path", d: "M22 80L30 64L38 80Z", fill: "bg" },
        text(54, 80, 20, "Your Bank", { w: 600 }),
      ],
    },
    {
      id: "site-banner",
      name: "Your account is locked! Sign in within 10 minutes to unlock it.",
      box: { x: 8, y: 94, w: 304, h: 48 },
      labelAt: { x: 298, y: 118 },
      els: [
        { t: "rect", x: 14, y: 95, w: 292, h: 46, r: 6, fill: "none", stroke: "warn", sw: 1.5 },
        text(24, 114, 15, "Your account is locked! Sign in", { w: 600, tone: "warn" }),
        text(24, 133, 15, "within 10 minutes to unlock it.", { w: 600, tone: "warn" }),
      ],
    },
    field("site-username", "Username", 146),
    field("site-password", "Password", 180),
    field("site-pin", "Card PIN", 214),
  ],
};

/* ── A phone call ──────────────────────────────────────────────────────────────────────── */

const bubble = (id: string, line: string, y: number): TextScenePart => ({
  id,
  name: line,
  box: { x: 8, y, w: 304, h: 34 },
  labelAt: { x: 296, y: y + 17 },
  els: [
    { t: "rect", x: 14, y: y + 1, w: 292, h: 32, r: 14, fill: "part", stroke: "edge", sw: 1 },
    text(26, y + 22, 16, line),
  ],
});

export const PHONE_CALL_SCENE: TextScene = {
  id: "phone-call",
  description: "A phone call in progress from an unknown number, with the caller's words as four speech bubbles and an End call button.",
  width: W,
  height: 252,
  base: [
    { t: "rect", x: 2, y: 2, w: W - 4, h: 248, r: 16, fill: "bg", stroke: "edge", sw: 1.5 },
    // End call (not a part: hanging up is what the lesson teaches, not a clue).
    { t: "circle", cx: 160, cy: 226, r: 17, fill: "warn" },
    { t: "path", d: "M149 228Q160 218 171 228L169 233L164 231L163 227Q160 226 157 227L156 231L151 233Z", fill: "bg" },
    text(185, 232, 15, "End call", { tone: "muted" }),
  ],
  parts: [
    {
      id: "call-caller",
      name: "Unknown number, 0:42",
      box: { x: 8, y: 8, w: 304, h: 48 },
      labelAt: { x: 296, y: 32 },
      els: [
        { t: "circle", cx: 34, cy: 32, r: 18, fill: "shell", stroke: "edge", sw: 1.5 },
        { t: "circle", cx: 34, cy: 27, r: 6, fill: "muted" },
        { t: "path", d: "M23 44Q34 32 45 44Z", fill: "muted" },
        text(62, 29, 17, "Unknown number", { w: 600 }),
        text(62, 49, 15, "0:42", { tone: "muted", mono: true }),
      ],
    },
    bubble("call-spending", "Someone is using your card now!", 60),
    bubble("call-code", "Read me the code we just texted.", 96),
    bubble("call-gift-cards", "Then buy $300 in gift cards.", 132),
    bubble("call-secret", "Don't tell anyone, not even family.", 168),
  ],
};

export const TEXT_SCENES = [
  EMAIL_SCENE,
  EMAIL_FROZEN_SCENE,
  EMAIL_PAYMENT_SCENE,
  TEXT_MESSAGE_SCENE,
  TEXT_TOLLS_SCENE,
  FAKE_WEBSITE_SCENE,
  PHONE_CALL_SCENE,
] as const;
