/**
 * Accounts are for ages 13 and older; guests of any age can play. We store only that the age was
 * confirmed (profiles.age_confirmed), never a date of birth.
 *
 * Ticking "I'm 13 or older" on /login leaves a pending flag in this browser, so the confirmation
 * is saved automatically right after sign-in (the magic link may open in another tab, so it's
 * localStorage, not sessionStorage). Accounts without a confirmation see a one-time prompt.
 */
export const AGE_PENDING_KEY = "cybernet.ageConfirmed.pending";

export function markAgePending(): void {
  try {
    localStorage.setItem(AGE_PENDING_KEY, "1");
  } catch {
    // Without storage, the one-time prompt asks again after sign-in.
  }
}

export function hasAgePending(): boolean {
  try {
    return localStorage.getItem(AGE_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearAgePending(): void {
  try {
    localStorage.removeItem(AGE_PENDING_KEY);
  } catch {
    // ignore
  }
}

/** What to show a signed-in learner: nothing, save the pending confirmation, or the prompt. Pure. */
export function ageGateStep(signedIn: boolean, ageConfirmed: boolean, pending: boolean): "none" | "auto-confirm" | "prompt" {
  if (!signedIn || ageConfirmed) return "none";
  return pending ? "auto-confirm" : "prompt";
}
