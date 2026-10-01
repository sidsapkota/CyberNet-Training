"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MailIcon } from "@/components/ui/icons";
import { markAgePending } from "@/lib/auth/age";
import { rememberNextPath } from "@/lib/auth/afterSignIn";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "./GoogleSignInButton";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

function friendlyError(error: { message: string; status?: number }): string {
  if (error.status === 429 || /rate limit|too many/i.test(error.message)) {
    return "Too many sign-in emails were sent recently. Wait a few minutes, then try again.";
  }
  return "Something went wrong. Check the email address and try again.";
}

const callbackUrl = () => `${window.location.origin}/auth/callback`;

/**
 * The sign-in (and sign-up: it's the same thing) controls: the 13+ check, Google, and an email
 * magic link. Used by /login and the sign-up gate. Assumes accounts are available.
 */
export function SignInOptions({
  next,
  onStart,
  linkError = false,
}: {
  /** Where to land after signing in (a same-site path). */
  next?: string;
  /** Just before sign-in starts (e.g. to note which lesson asked for it). */
  onStart?: () => void;
  linkError?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [over13, setOver13] = useState(false);
  const ageId = useId();
  const emailId = useId();
  const [status, setStatus] = useState<Status>(
    linkError ? { kind: "error", message: "That sign-in link didn't work or has expired. Request a new one." } : { kind: "idle" },
  );

  function start() {
    markAgePending();
    if (next) rememberNextPath(next);
    onStart?.();
  }

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address || !over13) return;
    start();
    setStatus({ kind: "sending" });
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setStatus(error ? { kind: "error", message: friendlyError(error) } : { kind: "sent", email: address });
  }

  async function google() {
    if (!over13) return;
    start();
    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setStatus({ kind: "error", message: friendlyError(error) });
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="w-full rounded-card border border-accent-ink bg-accent-soft p-5 text-center">
        <MailIcon className="mx-auto size-8 text-accent-ink" />
        <p className="mt-2 text-lead font-semibold">Check your email</p>
        <p className="mt-1 text-small text-ink-muted">
          We sent a sign-in link to <strong className="text-ink">{status.email}</strong>. Open it in this browser.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-3 min-h-11 text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Accounts are 13+. Only "confirmed" is stored, never a date of birth. */}
      <label
        htmlFor={ageId}
        className="mb-5 flex min-h-12 cursor-pointer items-center gap-3 rounded-control border border-line bg-surface px-4 text-left text-body"
      >
        <input
          id={ageId}
          type="checkbox"
          checked={over13}
          onChange={(e) => setOver13(e.target.checked)}
          className="size-5 shrink-0 accent-accent-ink"
        />
        I&apos;m 13 or older
      </label>
      <GoogleSignInButton onClick={() => void google()} disabled={!over13} />
      <div className="my-5 flex items-center gap-3 text-caption text-ink-faint" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={(e) => void sendLink(e)} className="flex flex-col gap-3 text-left">
        <label htmlFor={emailId} className="text-small font-semibold">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-control border border-line-strong bg-surface px-4 text-body text-ink outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent-ink/30"
          placeholder="you@example.com"
        />
        <Button type="submit" disabled={status.kind === "sending" || !over13}>
          <MailIcon className="size-5" /> {status.kind === "sending" ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
      {status.kind === "error" && (
        <p role="alert" className="mt-4 text-small text-danger">
          {status.message}
        </p>
      )}
      {!over13 && (
        <p className="mt-4 text-center text-small text-ink-muted">
          Accounts are for ages 13 and up. Anyone can keep playing as a guest.
        </p>
      )}
      <p className="mt-6 text-center text-caption text-ink-faint">
        We only keep your email and the name you choose. By signing in you agree to the{" "}
        <Link href="/terms" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
