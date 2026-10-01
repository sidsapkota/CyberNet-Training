/** What the header shows before a username is chosen. */
export const FALLBACK_NAME = "Learner";

export function initialOf(name: string | null | undefined): string {
  const first = (name ?? FALLBACK_NAME).trim().charAt(0);
  return first ? first.toLocaleUpperCase() : "L";
}
