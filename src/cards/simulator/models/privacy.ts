/**
 * Picture models for Stay Safe Online's "Guard Your Privacy" play cards (Lesson Blueprint's Play
 * beat). Each one turns a few switches or buttons into a list of states that a drawing shows
 * (`picture` outputs, drawn by `../pictures.tsx`) and a screen reader reads as text. Pure and
 * deterministic, like every model: content only configures them.
 */
import { z } from "zod";
import { bool, type InputSpec, type ListItem, type SimulatorModel } from "./types";

const Name = z.string().trim().min(1).max(12);
const Short = z.string().trim().min(1).max(24);

/* ── post-spread: a post reaches friends, then gets shared and saved ────────────────────── */

const SpreadParams = z.object({
  /** The friend who shares the post on, and the one who takes a screenshot. */
  sharer: Name.default("Jo"),
  saver: Name.default("Mo"),
  /** How many friends see the post, and how many more people get it when it's shared. */
  friends: z.number().int().min(2).max(4).default(4),
  sharedTo: z.number().int().min(1).max(3).default(3),
});

export const postSpreadModel: SimulatorModel<z.infer<typeof SpreadParams>> = {
  id: "post-spread",
  summary: "Buttons `post`, then `share` and `screenshot` (they do nothing until it's posted). Picture: the post on friends' phones.",
  picture: true,
  params: SpreadParams,
  inputs: () => ({
    post: { type: "boolean", default: false },
    share: { type: "boolean", default: false },
    screenshot: { type: "boolean", default: false },
  }),
  outputs: () => ({ people: { type: "number" }, phones: { type: "list" } }),
  run(inputs, p) {
    const posted = bool(inputs.post, false);
    const shared = posted && bool(inputs.share, false);
    const saved = posted && bool(inputs.screenshot, false);
    const people = posted ? p.friends + (shared ? p.sharedTo : 0) : 0;
    return {
      people,
      phones: [
        { id: "post", label: "Your post", value: posted ? 1 : 0, detail: posted ? "Posted" : "Not posted yet", state: posted ? "normal" : "off" },
        { id: "friends", label: "Who has it", value: people / (p.friends + p.sharedTo), detail: posted ? `${people} ${shared ? "people" : "friends"}` : "Nobody yet", state: posted ? "normal" : "off" },
        { id: "shared", label: `${p.sharer} shared it`, value: shared ? 1 : 0, detail: shared ? `${p.sharedTo} more people` : "Not yet", state: shared ? "normal" : "off" },
        { id: "saved", label: `${p.saver}'s screenshot`, value: saved ? 1 : 0, detail: saved ? "Saved" : "Not yet", state: saved ? "normal" : "off" },
      ] satisfies ListItem[],
    };
  },
};

/* ── privacy-switches: what a stranger can see ───────────────────────────────────────────── */

const SwitchParams = z.object({
  place: Short.default("Near Fern Park"),
  tagger: Name.default("Jo"),
});

export const privacySwitchesModel: SimulatorModel<z.infer<typeof SwitchParams>> = {
  id: "privacy-switches",
  summary: "Toggles `privateAccount`, `shareLocation`, `reviewTags`. Picture: what a stranger can see (posts, location, a tagged photo).",
  picture: true,
  params: SwitchParams,
  inputs: () => ({
    privateAccount: { type: "boolean", default: false },
    shareLocation: { type: "boolean", default: true },
    reviewTags: { type: "boolean", default: false },
  }),
  outputs: () => ({ seen: { type: "number" }, strangerView: { type: "list" } }),
  run(inputs, p) {
    const postsSeen = !bool(inputs.privateAccount, false);
    const placeSeen = bool(inputs.shareLocation, true);
    const tagSeen = !bool(inputs.reviewTags, false);
    return {
      seen: [postsSeen, placeSeen, tagSeen].filter(Boolean).length,
      strangerView: [
        { id: "posts", label: "Posts", value: postsSeen ? 1 : 0, detail: postsSeen ? "Anyone can see" : "Followers only", state: postsSeen ? "high" : "off" },
        { id: "location", label: "Location", value: placeSeen ? 1 : 0, detail: placeSeen ? p.place : "Hidden", state: placeSeen ? "high" : "off" },
        { id: "tags", label: `Tagged by ${p.tagger}`, value: tagSeen ? 1 : 0, detail: tagSeen ? "On your profile" : "Waiting for your OK", state: tagSeen ? "high" : "off" },
      ] satisfies ListItem[],
    };
  },
};

/* ── app-permissions: what an app can reach ──────────────────────────────────────────────── */

const PermissionParams = z.object({
  /** The number shown on the contacts window. */
  contacts: z.number().int().min(1).max(9999).default(214),
});

export const PERMISSIONS = ["camera", "microphone", "location", "contacts"] as const;

export const appPermissionsModel: SimulatorModel<z.infer<typeof PermissionParams>> = {
  id: "app-permissions",
  summary: "Toggles `camera`, `microphone`, `location`, `contacts` (all off to start). Picture: what the app can now reach.",
  picture: true,
  params: PermissionParams,
  inputs: () => Object.fromEntries(PERMISSIONS.map((id) => [id, { type: "boolean", default: false } satisfies InputSpec])),
  outputs: () => ({ allowed: { type: "number" }, reach: { type: "list" } }),
  run(inputs, p) {
    const on = (id: (typeof PERMISSIONS)[number]) => bool(inputs[id], false);
    const row = (id: (typeof PERMISSIONS)[number], label: string, detail: string): ListItem => ({
      id,
      label,
      value: on(id) ? 1 : 0,
      detail: on(id) ? detail : "Off",
      state: on(id) ? "high" : "off",
    });
    return {
      allowed: PERMISSIONS.filter(on).length,
      reach: [
        row("camera", "Camera", "Takes photos"),
        row("microphone", "Microphone", "Can hear you"),
        row("location", "Location", "Sees where you are"),
        row("contacts", "Contacts", `Sees ${p.contacts.toLocaleString("en-AU")} contacts`),
      ],
    };
  },
};
