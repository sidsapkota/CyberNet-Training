"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { TerminalIcon } from "@/components/ui/icons";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps } from "../types";
import { transcript } from "./grade";
import type { TerminalAnswer, TerminalCard } from "./schema";

/**
 * A simulated terminal. It only looks up the card's scripted outputs (see `runCommand`):
 * nothing is executed, evaluated or fetched. Always drawn on the navy `screen` panel.
 */
export function TerminalCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<TerminalCard, TerminalAnswer>) {
  const locked = status !== "answering";
  const [draft, setDraft] = useState("");
  /** Position while browsing history with the arrow keys; null = editing a new line. */
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const answerId = useId();
  const entries = transcript(card, answer.history);
  const typed = answer.history.filter((h) => h.trim() !== "");

  // Keep the newest output in view (DOM-only; no state involved).
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [answer.history.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    onAnswerChange({ ...answer, history: [...answer.history, draft] });
    setDraft("");
    setHistoryIndex(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (typed.length === 0) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = historyIndex === null ? typed.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setDraft(typed[next] ?? "");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= typed.length) {
        setHistoryIndex(null);
        setDraft("");
      } else {
        setHistoryIndex(next);
        setDraft(typed[next] ?? "");
      }
    }
  }

  const prompt = <span className="text-screen-accent">{card.promptLabel}</span>;

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>

      <div
        className="mt-3 overflow-hidden rounded-card border border-screen-line bg-screen text-on-screen sm:mt-6"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-2 border-b border-screen-line px-3 py-2">
          <TerminalIcon className="size-4 text-on-screen-muted" />
          <span className="font-mono text-caption tracking-wider text-on-screen-muted uppercase">Terminal</span>
          <span className="ml-auto rounded-sm border border-screen-line px-1.5 font-mono text-[0.65rem] tracking-wider text-on-screen-muted uppercase">
            simulated
          </span>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Terminal output"
          // Phones: about a third of the screen (the output scrolls inside), so the command line and the
          // answer box stay in view.
          className="max-h-[min(32dvh,28rem)] min-h-28 overflow-auto px-3 py-2 font-mono text-small leading-relaxed whitespace-pre sm:max-h-[min(60dvh,28rem)] sm:min-h-40 sm:py-3"
        >
          {/* Intros of 3+ lines are saved output (keep the columns); shorter ones are prose (wrap). */}
          {card.intro && (
            <p className={`mb-2 text-on-screen-muted ${card.intro.split("\n").length >= 3 ? "whitespace-pre" : "whitespace-pre-wrap"}`}>
              {card.intro}
            </p>
          )}
          {entries.map((entry, i) => (
            <div key={i} className="mb-1">
              <p>
                {prompt} {entry.input}
              </p>
              {"text" in entry.result && (
                <p
                  className={
                    entry.result.kind === "unknown"
                      ? "text-screen-danger"
                      : entry.result.kind === "help"
                        ? "text-on-screen-muted"
                        : "text-on-screen"
                  }
                >
                  {entry.result.text}
                </p>
              )}
            </div>
          ))}

          {locked ? (
            <p className="mt-1 text-on-screen-muted">[session ended]</p>
          ) : (
            <form onSubmit={submit} className="flex items-center gap-2">
              <label htmlFor={inputId} className="shrink-0">
                {prompt}
                <span className="sr-only">Type a command and press Enter</span>
              </label>
              <input
                ref={inputRef}
                id={inputId}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setHistoryIndex(null);
                }}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="send"
                // 17px keeps iOS from zooming into the field.
                className="min-h-11 min-w-0 flex-1 bg-transparent font-mono text-body text-on-screen caret-screen-accent outline-none"
              />
            </form>
          )}
        </div>
      </div>
      <p className="mt-2 text-caption text-ink-faint">
        Type <code className="font-mono">help</code> to see the commands. <kbd className="font-mono">↑</kbd> repeats earlier ones.
      </p>

      {card.success.type === "answer" && (
        <div className="mt-3 sm:mt-6">
          <label htmlFor={answerId} className="block font-semibold text-ink">
            {card.success.question}
          </label>
          <input
            id={answerId}
            value={answer.response}
            onChange={(e) => onAnswerChange({ ...answer, response: e.target.value })}
            readOnly={locked}
            data-enter-submits
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className={`mt-2 min-h-12 w-full max-w-sm rounded-control border-2 bg-surface px-3 font-mono text-lead text-ink outline-none transition-colors read-only:cursor-default ${
              status === "correct"
                ? "border-success bg-success-soft"
                : status === "incorrect"
                  ? "border-danger bg-danger-soft"
                  : "border-line-strong focus:border-accent-ink"
            }`}
          />
        </div>
      )}

      <CardStatusNote
        status={status}
        correctText={card.success.type === "answer" ? "That's the right answer" : "You ran the right command"}
        incorrectText={
          card.success.type === "answer" ? "That's not what the output shows" : "That command doesn't do the job yet"
        }
      />
    </div>
  );
}
