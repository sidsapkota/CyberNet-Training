"use client";

import { useId, useState, useTransition } from "react";
import { changeHandleAction, setShowOnLeaderboardsAction } from "@/app/actions/leagues";
import { Button } from "@/components/ui/Button";
import { HiddenIcon } from "@/components/ui/icons";
import { HANDLE_MAX } from "@/lib/leagues/handles";

/**
 * The learner's public handle and the "Show me on leaderboards" switch (on /leagues and
 * /account). Handles are checked on the server: no real names, contact details or rude words.
 */
export function LeagueSettings({
  handle: initialHandle,
  showOnLeaderboards: initialShow,
  onChange,
  className = "",
}: {
  handle: string;
  showOnLeaderboards: boolean;
  onChange?: () => void;
  className?: string;
}) {
  const id = useId();
  const [saved, setSaved] = useState(initialHandle);
  const [handle, setHandle] = useState(initialHandle);
  const [show, setShow] = useState(initialShow);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function saveHandle(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await changeHandleAction(handle);
      if (result.ok) {
        setSaved(result.handle);
        setHandle(result.handle);
        setMessage({ tone: "ok", text: "Saved." });
        onChange?.();
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

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
      <form onSubmit={saveHandle} className="mt-3">
        <label htmlFor={`${id}-handle`} className="text-small font-semibold">
          Your public handle
        </label>
        <div className="mt-2 flex flex-col gap-2 @md:flex-row">
          <input
            id={`${id}-handle`}
            value={handle}
            maxLength={HANDLE_MAX}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setHandle(e.target.value);
              setMessage(null);
            }}
            aria-describedby={`${id}-handle-help`}
            className="min-h-12 flex-1 rounded-control border border-line-strong bg-surface px-4 font-semibold text-ink outline-none focus-visible:border-accent-ink"
          />
          <Button type="submit" variant="secondary" disabled={pending || handle.trim() === "" || handle.trim() === saved}>
            Save
          </Button>
        </div>
        <p id={`${id}-handle-help`} className="mt-2 text-caption text-ink-faint">
          Others in your league see this. Never use your real name or contact details. You can change it once a week.
        </p>
        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-small ${message.tone === "error" ? "text-danger" : "text-success"}`}>
            {message.text}
          </p>
        )}
      </form>

      <div className="mt-5 flex items-center justify-between gap-4">
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
      {!show && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-control bg-surface-raised px-3 py-2 text-small text-ink-muted">
          <HiddenIcon className="size-4 shrink-0" /> You&apos;re hidden from leaderboards.
        </p>
      )}
    </section>
  );
}
