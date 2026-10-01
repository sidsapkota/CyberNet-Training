"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckIcon, RatingIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FEEDBACK_MAX, feedbackSessionId, friendlyFeedbackError } from "@/lib/feedback-form";
import { CONTACT_EMAIL } from "@/lib/site";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * A short feedback form: message (required), which lesson and a 1–5 rating (both optional).
 * Sent to `/api/feedback`, which stores it in Supabase's `feedback` table (anyone can add to it,
 * nobody can read it back: RLS) and emails a copy to the owner. Not linked to an account.
 */
export function FeedbackForm({ lessons, initialLesson }: { lessons: { id: string; title: string }[]; initialLesson: string | null }) {
  const { available } = useAuth();
  const [message, setMessage] = useState("");
  const [lesson, setLesson] = useState(initialLesson ?? "");
  const [rating, setRating] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const ids = { message: useId(), help: useId(), count: useId(), lesson: useId() };
  const trimmed = message.trim();

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || trimmed.length > FEEDBACK_MAX) return;
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          lessonId: lesson || null,
          rating,
          sessionId: feedbackSessionId(),
          page: document.referrer || null,
        }),
      });
      if (response.ok) return setStatus({ kind: "sent" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus({ kind: "error", message: body.error ?? friendlyFeedbackError("") });
    } catch {
      setStatus({ kind: "error", message: friendlyFeedbackError("") });
    }
  }

  if (!available) {
    return (
      <p className="rounded-card border border-line bg-surface p-5 text-body text-ink-muted">
        Feedback isn&apos;t set up on this copy of CyberNet. You can email{" "}
        <a className="font-semibold text-accent-ink underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>{" "}
        instead.
      </p>
    );
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-card border border-success bg-success-soft p-5 text-center">
        <CheckIcon className="mx-auto size-8 text-success" />
        <p className="mt-2 text-lead font-semibold">Thanks! We read every message.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void send(e)} className="flex flex-col gap-6">
      <div>
        <label htmlFor={ids.message} className="text-body font-semibold">
          Your message
        </label>
        <textarea
          id={ids.message}
          required
          rows={5}
          maxLength={FEEDBACK_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-describedby={`${ids.help} ${ids.count}`}
          className="mt-2 w-full rounded-control border border-line-strong bg-surface px-4 py-3 text-body text-ink outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent-ink/30"
        />
        <div className="mt-1 flex justify-between gap-3 text-small">
          <p id={ids.help} className="text-ink-muted">
            Please don&apos;t include personal details.
          </p>
          <p id={ids.count} className="shrink-0 font-mono text-ink-faint" aria-live="polite">
            {message.length}/{FEEDBACK_MAX}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={ids.lesson} className="text-body font-semibold">
          Which lesson? <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <select
          id={ids.lesson}
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          className="mt-2 min-h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-body text-ink outline-none focus-visible:border-accent-ink focus-visible:ring-2 focus-visible:ring-accent-ink/30"
        >
          <option value="">Not about one lesson</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="text-body font-semibold">
          How was it? <span className="font-normal text-ink-muted">(optional)</span>
        </legend>
        {/* Native radios: arrow keys, Space and screen readers work as expected. */}
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = rating !== null && n <= rating;
            return (
              <label
                key={n}
                className="grid size-11 cursor-pointer place-items-center rounded-control text-ink-muted hover:bg-surface-raised has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-ink"
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only"
                />
                <span className="sr-only">{`${n} star${n === 1 ? "" : "s"}`}</span>
                <RatingIcon aria-hidden="true" className={`size-7 ${on ? "fill-accent text-accent-ink" : ""}`} />
              </label>
            );
          })}
          {rating !== null && (
            <button
              type="button"
              onClick={() => setRating(null)}
              className="ml-2 min-h-11 text-small font-semibold text-ink-muted underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </fieldset>

      <Button type="submit" disabled={!trimmed || status.kind === "sending"} className="w-full sm:w-auto">
        {status.kind === "sending" ? "Sending…" : "Send feedback"}
      </Button>
      {status.kind === "error" && (
        <p role="alert" className="-mt-2 text-small text-danger">
          {status.message}
        </p>
      )}
    </form>
  );
}
