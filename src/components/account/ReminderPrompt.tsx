"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { reminderPromptAction, setReminderEmailsAction } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { reminderPromptKey } from "@/lib/reminders/rules";

function dismissed(userId: string): boolean {
  try {
    return localStorage.getItem(reminderPromptKey(userId)) === "1";
  } catch {
    return false;
  }
}

/**
 * A one-time dashboard card for learners whose accounts were made before the sign-up opt-in: "Want
 * a reminder before your streak ends?". Pressing "Remind me" is the learner's own opt-in (consent is
 * recorded on the server, as with the /account switch); "No thanks" hides it for good on this device.
 * The server decides who sees it (`reminderPromptAction`); anyone who ever opted in is never asked.
 */
export function ReminderPrompt() {
  const { auth, available } = useAuth();
  const userId = available && auth.status === "signed-in" ? auth.userId : null;
  const [state, setState] = useState<"hidden" | "ask" | "done">("hidden");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!userId || dismissed(userId)) return;
    let live = true;
    reminderPromptAction().then(
      (show) => live && show && setState("ask"),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [userId]);

  if (!userId || state === "hidden") return null;

  function hide() {
    setState("hidden");
    try {
      if (userId) localStorage.setItem(reminderPromptKey(userId), "1");
    } catch {
      // storage blocked: it may ask once more on another visit
    }
  }

  return (
    <section aria-labelledby="reminder-prompt-title" className="mb-4 rounded-card border border-line-strong bg-surface p-5 shadow-card">
      {state === "done" ? (
        <div role="status">
          <h2 id="reminder-prompt-title" className="text-lead font-semibold">
            Reminders are on
          </h2>
          <p className="mt-1 text-ink-muted">
            Turn them off any time from an email or your{" "}
            <Link href="/account" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
              account
            </Link>
            .
          </p>
          <Button variant="secondary" className="mt-3" onClick={hide}>
            Got it
          </Button>
        </div>
      ) : (
        <>
          <h2 id="reminder-prompt-title" className="text-lead font-semibold">
            Want a reminder before your streak ends?
          </h2>
          <p className="mt-1 text-ink-muted">A short email before your streak or league ends. At most one a day; unsubscribe in one tap.</p>
          {error && (
            <p role="alert" className="mt-2 text-small text-danger">
              Couldn&apos;t save that. Please try again.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(false);
                  try {
                    await setReminderEmailsAction(true);
                    setState("done");
                  } catch {
                    setError(true);
                  }
                })
              }
            >
              Remind me
            </Button>
            <Button variant="ghost" disabled={pending} onClick={hide}>
              No thanks
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
