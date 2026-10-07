"use client";

import { useState } from "react";

/** The email stays hidden until asked for; each reveal is logged on the server (admin_audit). */
export function RevealEmail({ userId, hint, username }: { userId: string; hint: string; username: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (email) return <span className="font-mono [overflow-wrap:anywhere]">{email}</span>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const r = await fetch("/api/admin/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }).catch(() => null);
        const body = (await r?.json().catch(() => null)) as { email?: string | null } | null;
        setEmail(body?.email ?? "none");
        setPending(false);
      }}
      aria-label={`Show email for ${username}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-control text-ink-muted underline-offset-2 hover:text-ink hover:underline"
    >
      <span className="font-mono">{hint}</span> Show email
    </button>
  );
}
