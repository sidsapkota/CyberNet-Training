"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { confirmAgeAction } from "@/app/actions/account";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { ageGateStep, clearAgePending, hasAgePending } from "@/lib/auth/age";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * One-time check for signed-in accounts that haven't confirmed they're 13 or older (accounts
 * created before the check existed). A solid full-screen panel, not a see-through overlay.
 * Guests never see it.
 */
export function AgeGate() {
  const { auth, refreshProfile, signOut } = useAuth();
  const [pending] = useState(() => (typeof window === "undefined" ? false : hasAgePending()));
  const [under13, setUnder13] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  const signedIn = auth.status === "signed-in";
  const step = ageGateStep(signedIn, signedIn && auth.ageConfirmed, pending);

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      await confirmAgeAction();
      clearAgePending();
      await refreshProfile();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // Ticked on /login just before signing in: save it without asking again.
  useEffect(() => {
    if (step !== "auto-confirm") return;
    let cancelled = false;
    confirmAgeAction()
      .then(() => {
        clearAgePending();
        return refreshProfile();
      })
      .catch(() => {
        if (!cancelled) setFailed(true); // fall back to the prompt
      });
    return () => {
      cancelled = true;
    };
  }, [step, refreshProfile]);

  useEffect(() => {
    if (step === "prompt") headingRef.current?.focus();
  }, [step, under13]);

  if (step !== "prompt" && !(step === "auto-confirm" && failed)) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-canvas px-gutter py-10"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Mascot expression="presenting" size={120} idle />
        <h1 ref={headingRef} tabIndex={-1} id={titleId} className="mt-4 text-title font-semibold outline-none">
          {under13 ? "Accounts are for 13+" : "One quick check"}
        </h1>
        {under13 ? (
          <>
            <p className="mt-2 text-body text-ink-muted">
              We&apos;ll sign you out. You can keep playing every lesson as a guest. A parent or carer can ask us to
              delete this account at{" "}
              <a className="font-semibold text-accent-ink underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                clearAgePending();
                void signOut();
              }}
            >
              Sign out
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setUnder13(false)}>
              Back
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-body text-ink-muted">Accounts are for people aged 13 or older.</p>
            <Button className="mt-6 w-full" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Saving…" : "I'm 13 or older"}
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setUnder13(true)}>
              I&apos;m under 13
            </Button>
            {failed && (
              <p role="alert" className="mt-3 text-small text-danger">
                Couldn&apos;t save that. Check your connection and try again.
              </p>
            )}
          </>
        )}
        <p className="mt-6 text-caption text-ink-faint">
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
