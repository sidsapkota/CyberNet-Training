/**
 * Public handles. Learners can be 13, so a handle must never carry a real name, contact details or
 * anything rude. Generated handles are two brand-themed words and a number ("SwiftRouter42");
 * learners can edit theirs within these rules.
 */
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const HANDLE_MAX_DIGITS = 3;

const ADJECTIVES = [
  "Swift", "Bright", "Steady", "Clever", "Calm", "Bold", "Rapid", "Lucky", "Sharp", "Quiet",
  "Brave", "Keen", "Nimble", "Cosmic", "Silent", "Electric", "Shiny", "Sunny", "Turbo", "Wired",
] as const;
const NOUNS = [
  "Packet", "Router", "Switch", "Node", "Byte", "Pixel", "Signal", "Circuit", "Kernel", "Cache",
  "Socket", "Beacon", "Server", "Module", "Bit", "Vector", "Relay", "Proxy", "Cipher", "Photon",
] as const;

/**
 * A fresh handle, e.g. "SwiftRouter42". `random` returns [0, 1) (Math.random by default). Two
 * harmless words can still spell something rude across the join ("steaDY KErnel"), so it tries
 * again until the handle passes the same check learners' own handles do.
 */
export function generateHandle(random: () => number = Math.random): string {
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  for (;;) {
    const handle = `${pick(ADJECTIVES)}${pick(NOUNS)}${10 + Math.floor(random() * 90)}`;
    if (checkHandle(handle).ok) return handle;
  }
}

const profanity = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

/** Words that point at a real identity, a way to contact someone, or pretend to be staff. */
const BLOCKED_PARTS = [
  "myname", "mynameis", "realname", "imreal", "iamreal", "irl",
  "insta", "instagram", "snap", "snapchat", "tiktok", "discord", "whatsapp", "telegram", "kik",
  "youtube", "twitch", "facebook", "phone", "mobile", "email", "gmail", "hotmail", "outlook",
  "dmme", "textme", "callme", "addme", "address", "street",
  "admin", "cybernet", "moderator", "mod", "support", "official", "staff", "teacher",
];

export type HandleCheck = { ok: true; handle: string } | { ok: false; error: string };

/** Checks a handle the learner typed. The database checks the shape again. */
export function checkHandle(input: string): HandleCheck {
  const handle = input.trim();
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) {
    return { ok: false, error: `Use ${HANDLE_MIN} to ${HANDLE_MAX} letters and numbers.` };
  }
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(handle)) return { ok: false, error: "Start with a letter, then use only letters and numbers." };
  if ((handle.match(/[0-9]/g) ?? []).length > HANDLE_MAX_DIGITS) {
    return { ok: false, error: `Use at most ${HANDLE_MAX_DIGITS} numbers (no phone numbers or birth years).` };
  }
  const lower = handle.toLowerCase();
  if (BLOCKED_PARTS.some((part) => (part === "mod" || part === "irl" || part === "kik" ? lower === part : lower.includes(part)))) {
    return { ok: false, error: "Keep it anonymous: no names, contact details, social apps or staff words." };
  }
  if (profanity.hasMatch(handle) || profanity.hasMatch(handle.replace(/([a-z])([A-Z])/g, "$1 $2"))) {
    return { ok: false, error: "Please choose something friendlier." };
  }
  return { ok: true, handle };
}

/** The key that makes handles unique ignoring case. */
export const handleKey = (handle: string): string => handle.toLowerCase();
