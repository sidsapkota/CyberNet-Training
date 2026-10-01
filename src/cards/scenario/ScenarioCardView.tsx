"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { ArrowRightIcon, CheckIcon, XIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import { EASE_OUT_QUICK } from "@/lib/motion";
import { CardPrompt } from "../CardPrompt";
import { InlineText } from "../shared/InlineText";
import type { CardComponentProps } from "../types";
import { chooseScenario, walkScenario } from "./grade";
import type { ScenarioAnswer, ScenarioCard } from "./schema";

export function ScenarioCardView({ card, answer, onAnswerChange, status }: CardComponentProps<ScenarioCard, ScenarioAnswer>) {
  const reduceMotion = useReducedMotion();
  const locked = status !== "answering";
  const walk = walkScenario(card, answer);
  const promptId = useId();

  // Right or wrong only shows after Check. Before it, a picked ending is just the selected choice
  // (the learner can still change it). Try again takes the failed ending back off the answer
  // (`retryScenario`), and every ending already tried stays crossed out at its step.
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [previousStatus, setPreviousStatus] = useState(status);
  if (status !== previousStatus) {
    setPreviousStatus(status);
    const lastChoice = walk.history.at(-1)?.choice.id;
    if (status === "incorrect" && lastChoice) setFailed((current) => new Set(current).add(lastChoice));
  }
  const ended = walk.outcome !== null;
  const last = walk.history.at(-1);
  const activeStep = ended ? (last?.step ?? null) : walk.current;
  const selected = ended && last ? last.choice.id : null;
  const pastSteps = ended ? walk.history.slice(0, -1) : walk.history;
  const choices = !locked && activeStep ? activeStep.choices : null;

  function pick(choiceId: string) {
    onAnswerChange(chooseScenario(card, answer, choiceId));
  }

  useGlobalKeyDown((event) => {
    if (!choices) return;
    const index = digitKeyIndex(event.key, choices.length);
    const choice = index === null ? undefined : choices[index];
    if (choice && !failed.has(choice.id)) {
      event.preventDefault();
      pick(choice.id);
    }
  }, choices !== null);

  const enter = reduceMotion ? false : { opacity: 0, y: 10 };

  return (
    <div>
      <CardPrompt id={promptId}>{card.prompt}</CardPrompt>

      {pastSteps.length > 0 && (
        <ol className="mt-5 space-y-2" aria-label="What's happened so far">
          {pastSteps.map(({ step, choice }) => (
            <li key={step.id} className="rounded-card border border-line bg-surface-raised p-3 text-small">
              <p className="flex items-start gap-2 font-semibold text-ink">
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <InlineText>{choice.text}</InlineText>
              </p>
              <Markdown className="mt-1 text-ink-muted">{choice.consequence}</Markdown>
            </li>
          ))}
        </ol>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {activeStep && (
          <motion.section
            key={activeStep.id}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_QUICK }}
            className="mt-5"
            aria-labelledby={promptId}
          >
            <Markdown className="text-body text-ink">{activeStep.text}</Markdown>
            {choices && (
              <div className="mt-4 grid gap-2.5">
                {choices.map((choice, i) => {
                  const tried = failed.has(choice.id);
                  const isSelected = choice.id === selected;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={tried}
                      aria-pressed={isSelected}
                      onClick={() => pick(choice.id)}
                      aria-label={`${choice.text}${tried ? ", already tried: didn't work" : ""}`}
                      className={`flex min-h-12 items-center gap-3 rounded-control border-2 px-4 py-2.5 text-left text-body transition-colors ${
                        tried
                          ? "cursor-not-allowed border-line bg-surface text-ink-faint line-through"
                          : isSelected
                            ? "border-accent-ink bg-accent-soft text-ink"
                            : "border-line bg-surface text-ink hover:border-accent-ink hover:bg-accent-soft"
                      }`}
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-sm border font-mono text-caption ${
                          isSelected ? "border-accent-ink bg-accent text-on-accent" : "border-line-strong text-ink-muted"
                        }`}
                      >
                        {tried ? <XIcon className="size-4 text-danger" /> : i + 1}
                      </span>
                      <InlineText>{choice.text}</InlineText>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {/* The ending's consequence and outcome: only after Check. */}
        {ended && last && locked && (
          <motion.div
            key={last.choice.id}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_QUICK }}
            role="status"
            className={`mt-5 rounded-card border-2 p-4 ${walk.outcome === "success" ? "border-success bg-success-soft" : "border-danger bg-danger-soft"}`}
          >
            <p className="flex items-start gap-2 font-semibold text-ink">
              <ArrowRightIcon className="mt-0.5 size-4 shrink-0" />
              <InlineText>{last.choice.text}</InlineText>
            </p>
            <Markdown className="mt-1 text-ink">{last.choice.consequence}</Markdown>
            <p
              className={`mt-3 inline-flex items-center gap-1.5 text-small font-semibold ${walk.outcome === "success" ? "text-success" : "text-danger"}`}
            >
              {walk.outcome === "success" ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
              {walk.outcome === "success" ? "That worked" : "That didn't work out"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
