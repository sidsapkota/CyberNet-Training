"use client";

import { useId, useState, useTransition } from "react";
import { setReminderEmailsAction } from "@/app/actions/account";

/**
 * Reminder emails, opt-in only: "Email me before my streak or league ends". Never ticked for anyone
 * until they tick it. A checkbox on the "Pick a username" sign-up step (`variant="signup"`), and a
 * switch in its own panel on /account. Saved straight away through the Server Action.
 */
export function ReminderSetting({ initial, variant = "panel", className = "" }: { initial: boolean; variant?: "signup" | "panel"; className?: string }) {
  const id = useId();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setOn(next);
    setError(false);
    startTransition(async () => {
      try {
        await setReminderEmailsAction(next);
      } catch {
        setOn(!next);
        setError(true);
      }
    });
  }

  const note = "At most one email a day. Unsubscribe in one tap from any email.";
  const errorLine = error && (
    <p role="alert" className="mt-2 text-small text-danger">
      Couldn&apos;t save that. Please try again.
    </p>
  );

  if (variant === "signup") {
    return (
      <div className={className}>
        <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-small">
          <input id={id} type="checkbox" checked={on} disabled={pending} onChange={(e) => change(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent-ink)]" />
          <span>
            Email me before my streak or league ends
            <span className="block text-caption text-ink-faint">{note}</span>
          </span>
        </label>
        {errorLine}
      </div>
    );
  }

  return (
    <section aria-labelledby={`${id}-title`} className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="font-semibold">
            Reminder emails
          </h2>
          <p id={`${id}-desc`} className="mt-1 text-small text-ink-muted">
            A short email before your streak or league ends. {note}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-desc`}
          disabled={pending}
          onClick={() => change(!on)}
          className="grid min-h-11 min-w-14 shrink-0 place-items-center rounded-control"
        >
          <span aria-hidden="true" className={`relative h-7 w-12 rounded-node border-2 transition-colors ${on ? "border-accent-ink bg-accent" : "border-line-strong bg-surface-raised"}`}>
            <span className={`absolute top-0.5 size-5 rounded-node transition-[left] ${on ? "left-[1.4rem] bg-on-accent" : "left-0.5 bg-ink-muted"}`} />
          </span>
        </button>
      </div>
      {errorLine}
    </section>
  );
}
