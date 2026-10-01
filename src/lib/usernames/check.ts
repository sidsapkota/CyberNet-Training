/**
 * Usernames: the one public identity (header, dashboard, leagues). Checked on the server on
 * sign-up, on every change, when generating, after reports and in the one-off scan; the browser
 * only shows hints. Pure, so every rule is unit-tested (check.test.ts has the tricky examples).
 */
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";
import { ALLOWED, ANYWHERE, BLOCKED_NUMBERS, WHOLE } from "./words";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_MAX_DIGITS = 3;

export type UsernameProblem = "length" | "characters" | "letters" | "digits" | "blocked";
export type UsernameCheck = { ok: true; username: string } | { ok: false; problem: UsernameProblem; message: string };

/** Friendly messages. A blocked word never says which word was caught. */
export const USERNAME_MESSAGES: Record<UsernameProblem | "taken", string> = {
  length: `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.`,
  characters: "Use only letters, numbers and underscores.",
  letters: "Include at least one letter.",
  digits: `Use at most ${USERNAME_MAX_DIGITS} numbers (no phone numbers or birth years).`,
  blocked: "Try a different username.",
  taken: "That username is taken. Try another.",
};

const fail = (problem: UsernameProblem): UsernameCheck => ({ ok: false, problem, message: USERNAME_MESSAGES[problem] });

const LEET_I: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "6": "g", "7": "t", "8": "b", "9": "g" };
const LEET_L: Record<string, string> = { ...LEET_I, "1": "l" };
const leet = (s: string, map: Record<string, string>) => s.replace(/[0-9]/g, (d) => map[d] ?? d);
/** "fuuuck" → "fuck". */
const collapse1 = (s: string) => s.replace(/(.)\1+/g, "$1");
/** "asssss" → "ass" (keeps real double letters). */
const collapse2 = (s: string) => s.replace(/(.)\1{2,}/g, "$1$1");
const hasDouble = (w: string) => /(.)\1/.test(w);

const ALLOWED_LONGEST = [...ALLOWED].sort((a, b) => b.length - a.length);
const ALLOWED_COLLAPSED = [...new Set(ALLOWED.map(collapse1))].sort((a, b) => b.length - a.length);
/**
 * Takes innocent words out first, leaving a gap so the letters either side never join up. A name
 * with its repeated letters collapsed ("susex") is matched against collapsed innocent words too.
 */
function withoutAllowed(s: string, collapsed = false): string {
  let out = s;
  for (const word of collapsed ? ALLOWED_COLLAPSED : ALLOWED_LONGEST) out = out.split(word).join("|");
  return out;
}

/** The name as plain lower-case letters, in every spelling a disguise could hide behind. */
function forms(name: string): string[] {
  const joined = name.toLowerCase().replace(/_/g, "");
  return [...new Set([joined, leet(joined, LEET_I), leet(joined, LEET_L)])];
}

/** The name's parts, split by underscores, capitals and digits ("Adm1n_Team" → adm, 1, n, team). */
function parts(name: string): string[] {
  return name
    .split("_")
    .flatMap((p) => p.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])/))
    .filter(Boolean)
    .map((p) => p.toLowerCase());
}

const profanity = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

/** True when the name contains a blocked word, in any disguise. */
export function hasBlockedWord(name: string): boolean {
  for (const form of forms(name)) {
    const variants = [form, collapse2(form)].map((v) => withoutAllowed(v));
    const single = withoutAllowed(collapse1(form), true);
    for (const word of ANYWHERE) {
      if (variants.some((v) => v.includes(word))) return true;
      if (!hasDouble(word) && single.includes(word)) return true;
    }
    // A short word as the whole name ("ass", "a55", "asssss").
    if (WHOLE.includes(form) || WHOLE.includes(collapse2(form)) || WHOLE.includes(collapse1(form))) return true;
  }
  for (const part of parts(name)) {
    for (const p of [part, leet(part, LEET_I), leet(part, LEET_L)]) {
      if (WHOLE.includes(p) || WHOLE.includes(collapse2(p)) || WHOLE.includes(collapse1(p))) return true;
    }
  }
  const digits = name.match(/[0-9]+/g) ?? [];
  if (digits.some((group) => BLOCKED_NUMBERS.some((n) => group.includes(n)))) return true;
  const cleaned = withoutAllowed(name.toLowerCase());
  return profanity.hasMatch(cleaned) || profanity.hasMatch(name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " "));
}

/** Checks a username the learner typed (or one we generated). The database checks the shape again. */
export function checkUsername(input: string): UsernameCheck {
  const username = input.trim();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return fail("length");
  if (!/^[A-Za-z0-9_]+$/.test(username)) return fail("characters");
  if (!/[A-Za-z]/.test(username)) return fail("letters");
  if ((username.match(/[0-9]/g) ?? []).length > USERNAME_MAX_DIGITS) return fail("digits");
  if (hasBlockedWord(username)) return fail("blocked");
  return { ok: true, username };
}

/** The key that makes usernames unique ignoring case (the database index uses lower() too). */
export const usernameKey = (username: string): string => username.toLowerCase();
