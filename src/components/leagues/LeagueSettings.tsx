"use client";

import { useId, useState, useTransition } from "react";
import { setShowOnLeaderboardsAction } from "@/app/actions/leagues";
import { HiddenIcon } from "@/components/ui/icons";

/**
 * The "Show me on leaderboards" switch (on /leagues and /account). Leaderboards show the learner's
 * username, which they change in account settings (one place for it).
 */
export function LeagueSettings({
  showOnLeaderboards: initialShow,
  onChange,
  className = "",
}: {
  showOnLeaderboards: boolean;
  onChange?: () => void;
  className?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(initialShow);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleShow() {
    const next = !show;
    setShow(next);
    startTransition(async () => {
      try {
        await setShowOnLeaderboardsAction(next);
        onChange?.();
      } catch {
        setShow(!next);
        setMessage({ tone: "error", text: "Couldn't save that. Please try again." });
      }
    });
  }

  return (
    <section aria-labelledby={`${id}-title`} className={`@container ${className}`}>
      <h2 id={`${id}-title`} className="font-semibold">
        Leaderboards
      </h2>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <p id={`${id}-show`} className="text-small font-semibold">
            Show me on leaderboards
          </p>
          <p className="text-caption text-ink-faint">Off: nobody else sees you in leagues, and your tier stays as it is.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={show}
          aria-labelledby={`${id}-show`}
          onClick={toggleShow}
          disabled={pending}
          className={`relative h-8 w-14 shrink-0 rounded-node border-2 transition-colors ${show ? "border-accent-ink bg-accent" : "border-line-strong bg-surface-raised"}`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-node transition-all ${show ? "left-[calc(100%-1.5rem)] bg-on-accent" : "left-1 bg-ink-muted"}`}
          />
        </button>
      </div>
      {message && (
        <p role="alert" className="mt-2 text-small text-danger">
          {message.text}
        </p>
      )}
      {!show && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-control bg-surface-raised px-3 py-2 text-small text-ink-muted">
          <HiddenIcon className="size-4 shrink-0" /> You&apos;re hidden from leaderboards.
        </p>
      )}
    </section>
  );
}
