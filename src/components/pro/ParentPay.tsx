"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createParentLinkAction } from "@/app/actions/pro";
import { Button } from "@/components/ui/Button";
import { trackEvent, trackWith } from "@/lib/analytics";
import { type FounderScreen, parentLinkEventData } from "@/lib/pro/founder";

/** The parent's one button (a plain form post, so it works even without JavaScript). */
export function ParentPayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="min-h-14 w-full text-lead" disabled={pending}>
      {pending ? "Opening Stripe…" : label}
    </Button>
  );
}

/** On the thank-you page: the purchase, once per tab. */
export function ParentLinkPaid() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    try {
      if (sessionStorage.getItem("cybernet.parentPaidTracked")) return;
      sessionStorage.setItem("cybernet.parentPaidTracked", "1");
    } catch {
      // storage blocked: track it anyway
    }
    trackEvent("parent_link_paid");
  }, []);
  return null;
}

/** The small text link under the lifetime button (small text, a 44px tap target). */
export const PARENT_LINK_LABEL = "Can't pay? Send it to a parent";
export const PARENT_LINK_CLASS = "inline-flex min-h-11 items-center text-small font-semibold text-accent-ink underline-offset-2 hover:underline";

/**
 * "Can't pay? Send it to a parent", straight under the lifetime button: makes a one-time link a parent can open on their own
 * phone or computer to pay for this learner's account, then offers Share (where the device has it)
 * and Copy. For teens without a card of their own.
 */
export function SendToParent({ screen }: { screen: FounderScreen }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  // The link appears below the button: bring it into view.
  useEffect(() => {
    if (url) panel.current?.scrollIntoView({ block: "nearest" });
  }, [url]);

  async function create() {
    setBusy(true);
    setError(null);
    const result = await createParentLinkAction().catch(() => ({ error: "We couldn't make a link just now. Please try again." }));
    setBusy(false);
    if ("url" in result) {
      setUrl(result.url);
      trackWith("parent_link_created", parentLinkEventData(screen));
    } else setError(result.error);
  }

  if (!url) {
    return (
      <div className="text-center">
        <button type="button" onClick={() => void create()} disabled={busy} className={PARENT_LINK_CLASS}>
          {busy ? "Making a link…" : PARENT_LINK_LABEL}
        </button>
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const message = "Could you get me lifetime CyberNet Training Pro? It's a one-off payment, no account needed:";
  return (
    <div ref={panel} className="mt-2 rounded-control border border-line bg-surface-raised p-3 text-left">
      <p className="text-small">Send this to a parent or guardian. They can pay on their own phone or computer, no account needed. It works for 7 days.</p>
      <input readOnly value={url} aria-label="Link for a parent" onFocus={(e) => e.currentTarget.select()} className="mt-2 min-h-11 w-full rounded-control border border-line bg-surface px-3 font-mono text-caption text-ink" />
      <div className="mt-2 flex gap-2">
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button variant="secondary" className="flex-1" onClick={() => void navigator.share({ text: message, url }).catch(() => undefined)}>
            Share
          </Button>
        )}
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() =>
            void navigator.clipboard.writeText(`${message} ${url}`).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
