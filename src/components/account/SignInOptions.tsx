"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckIcon, MailIcon } from "@/components/ui/icons";
import { markAgePending } from "@/lib/auth/age";
import { afterSignInPath, cleanCode, isCodeReady, rememberNextPath, takeNextPath } from "@/lib/auth/afterSignIn";
import { type InAppBrowser, inAppBrowser } from "@/lib/auth/inApp";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "./GoogleSignInButton";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "code"; email: string; verifying?: boolean; error?: string }
  | { kind: "error"; message: string };

function friendlyError(error: { message: string; status?: number }): string {
  if (error.status === 429 || /rate limit|too many/i.test(error.message)) {
    return "Too many sign-in emails were sent recently. Wait a few minutes, then try again.";
  }
  return "Something went wrong. Check the email address and try again.";
}

function codeError(error: { message: string; status?: number }): string {
  if (error.status === 429 || /rate limit|too many/i.test(error.message)) return "Too many tries. Wait a minute, then try again.";
  if (/expired/i.test(error.message)) return "That code has expired. Send a new one.";
  return "That code didn't work. Check it and try again, or send a new one.";
}

const callbackUrl = () => `${window.location.origin}/auth/callback`;

/**
 * The sign-in (and sign-up: it's the same thing) controls: the 13+ check, Google, and email. The
 * email has a 6-digit code to type in here, which works in any browser, including the ones inside
 * Instagram or TikTok (where Google sign-in is blocked, and a link from the email would open in a
 * different browser, without this one's guest progress). It also has a sign-in button, for normal
 * browsers. Used by /login and the sign-up gate. Assumes accounts are available.
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
  const [code, setCode] = useState("");
  const [over13, setOver13] = useState(false);
  // Read after mount, so the server and first client render match.
  const [inApp, setInApp] = useState<InAppBrowser | null>(null);
  const ageId = useId();
  const emailId = useId();
  const codeId = useId();
  const [status, setStatus] = useState<Status>(
    linkError ? { kind: "error", message: "That sign-in link didn't work or has expired. Request a new one." } : { kind: "idle" },
  );

  useEffect(() => {
    const id = window.setTimeout(() => setInApp(inAppBrowser(navigator.userAgent)), 0);
    return () => window.clearTimeout(id);
  }, []);

  function start() {
    markAgePending();
    if (next) rememberNextPath(next);
    onStart?.();
  }

  async function sendCode(address: string) {
    setStatus({ kind: "sending" });
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setCode("");
    setStatus(error ? { kind: "error", message: friendlyError(error) } : { kind: "code", email: address });
  }

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address || !over13) return;
    start();
    await sendCode(address);
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind !== "code" || !isCodeReady(code)) return;
    setStatus({ ...status, verifying: true, error: undefined });
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.auth.verifyOtp({ email: status.email, token: code, type: "email" });
    if (error || !data.user) {
      setStatus({ kind: "code", email: status.email, error: error ? codeError(error) : "That code didn't work." });
      return;
    }
    // Signed in, right here: guest progress in this browser merges as usual (AuthProvider). Then go
    // where a link would have gone: new accounts pick a name first.
    const { data: profile } = await client.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
    window.location.assign(afterSignInPath(takeNextPath(), Boolean(profile?.username)));
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

  if (status.kind === "code") {
    return (
      <div className="w-full text-left">
        <div role="status" className="rounded-card border border-accent-ink bg-accent-soft p-4 text-center">
          <MailIcon className="mx-auto size-7 text-accent-ink" />
          <p className="mt-2 text-lead font-semibold">Check your email</p>
          <p className="mt-1 text-small text-ink-muted">
            We sent a 6-digit code to <strong className="text-ink">{status.email}</strong>. Type it below. (The email also has a sign-in
            button, if you open it in this same browser.)
          </p>
        </div>
        <form onSubmit={(e) => void verify(e)} className="mt-4 flex flex-col gap-3">
          <label htmlFor={codeId} className="text-small font-semibold">
            Sign-in code
          </label>
          <input
            id={codeId}
            data-enter-submits
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={12}
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="123456"
            className="min-h-14 rounded-control border border-line-strong bg-surface px-4 text-center font-mono text-headline tracking-[0.3em] text-ink outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent-ink/30"
          />
          <Button type="submit" disabled={!isCodeReady(code) || status.verifying}>
            <CheckIcon className="size-5" /> {status.verifying ? "Checking…" : "Sign in"}
          </Button>
        </form>
        {status.error && (
          <p role="alert" className="mt-3 text-small text-danger">
            {status.error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-x-4">
          <button
            type="button"
            onClick={() => void sendCode(status.email)}
            className="min-h-11 text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
          >
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="min-h-11 text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
          >
            Use a different email
          </button>
        </div>
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
      {inApp ? <InAppTip app={inApp} /> : <GoogleSignInButton onClick={() => void google()} disabled={!over13} />}
      <div className="my-5 flex items-center gap-3 text-caption text-ink-faint" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {inApp ? "sign in here with email" : "or"}
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
          <MailIcon className="size-5" /> {status.kind === "sending" ? "Sending…" : "Email me a sign-in code"}
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

/**
 * Inside Instagram, TikTok and similar apps, Google blocks sign-in. Say so, show how to open the page
 * in a real browser, and offer to copy the link; the email code below works right here anyway.
 */
function InAppTip({ app }: { app: InAppBrowser }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Some in-app browsers block the clipboard: fall back to a prompt the learner can copy from.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface-raised p-4 text-left">
      <p className="font-semibold">Want to use Google?</p>
      <p className="mt-1 text-small text-ink-muted">
        Google sign-in doesn&apos;t work inside {app}. Open this page in Safari or Chrome: tap the{" "}
        <strong className="text-ink">•••</strong> menu at the top of the screen, then <strong className="text-ink">Open in browser</strong>.
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-small font-semibold text-ink hover:border-accent-ink"
      >
        {copied ? <CheckIcon className="size-4" /> : null}
        {copied ? "Link copied: paste it into your browser" : "Copy link"}
      </button>
    </div>
  );
}
