/** Only same-site paths are allowed after sign-in ("/account", not "//evil.example" or "https://…"). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
