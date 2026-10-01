/**
 * When a learner may change their username. Picking one at sign-up doesn't count: the first change
 * is free, then one every 30 days. A name replaced after reports (or by the safety scan) gives the
 * change back (`username_changed_at` is cleared). Pure, so it's tested.
 */
export const USERNAME_CHANGE_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** When the next change is allowed, or null if it's allowed now. */
export function nextUsernameChange(changedAt: string | null, now: Date): Date | null {
  if (!changedAt) return null;
  const next = new Date(new Date(changedAt).getTime() + USERNAME_CHANGE_DAYS * DAY);
  return next > now ? next : null;
}

export const canChangeUsername = (changedAt: string | null, now: Date): boolean => nextUsernameChange(changedAt, now) === null;
