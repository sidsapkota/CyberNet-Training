"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useGlobalKeyDown } from "@/lib/keyboard";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import { InlineText } from "../shared/InlineText";
import { plainText } from "../shared/text";
import type { CardComponentProps } from "../types";
import { connect, disconnect, pairResults, rightColumnOrder } from "./grade";
import type { MatchPairsAnswer, MatchPairsCard } from "./schema";

type Side = "left" | "right";
type Point = { x: number; y: number };
type Verdict = "correct" | "wrong" | null;

const portKey = (side: Side, id: string) => `${side}:${id}`;

export function MatchPairsCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<MatchPairsCard, MatchPairsAnswer>) {
  const locked = status !== "answering";
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const [ports, setPorts] = useState<Record<string, Point>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const portEls = useRef(new Map<string, HTMLElement>());

  const rightOrder = useMemo(() => rightColumnOrder(card), [card]);
  const byId = useMemo(() => new Map(card.pairs.map((p) => [p.id, p])), [card]);
  const leftOfRight = new Map(Object.entries(answer).map(([l, r]) => [r, l]));
  const verdictByLeft = new Map<string, Verdict>(
    locked ? pairResults(card, answer).map((r) => [r.leftId, r.rightId ? (r.correct ? "correct" : "wrong") : null]) : [],
  );
  const wrongCount = locked ? pairResults(card, answer).filter((r) => !r.correct).length : 0;

  // Measure port positions whenever the layout resizes (fonts loading, rotation, wrapping).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const base = container.getBoundingClientRect();
      const next: Record<string, Point> = {};
      for (const [key, el] of portEls.current) {
        const r = el.getBoundingClientRect();
        next[key] = { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
      }
      setPorts(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, []);

  useGlobalKeyDown((event) => {
    if (event.key === "Escape") setSelected(null);
  }, selected !== null);

  function tap(side: Side, id: string) {
    if (locked) return;
    if (!selected) return setSelected({ side, id });
    if (selected.side === side) return setSelected(selected.id === id ? null : { side, id });
    const leftId = side === "left" ? id : selected.id;
    const rightId = side === "right" ? id : selected.id;
    onAnswerChange(answer[leftId] === rightId ? disconnect(answer, leftId) : connect(answer, leftId, rightId));
    setSelected(null);
  }

  function itemClasses(isSelected: boolean, connected: boolean, verdict: Verdict) {
    if (verdict === "correct") return "border-success bg-success-soft";
    if (verdict === "wrong") return "border-danger bg-danger-soft";
    if (isSelected) return "border-accent-ink bg-accent-soft";
    if (connected) return "border-line-strong bg-surface";
    return "border-line bg-surface hover:border-line-strong hover:bg-surface-raised";
  }

  function portClasses(connected: boolean, verdict: Verdict) {
    if (verdict === "correct") return "border-success bg-success";
    if (verdict === "wrong") return "border-danger bg-danger";
    return connected ? "border-accent-ink bg-accent" : "border-line-strong bg-surface";
  }

  function renderItem(side: Side, id: string) {
    const pair = byId.get(id);
    if (!pair) return null;
    const text = side === "left" ? pair.left : pair.right;
    const partnerId = side === "left" ? answer[id] : leftOfRight.get(id);
    const partner = partnerId ? byId.get(partnerId) : undefined;
    const partnerText = partner ? plainText(side === "left" ? partner.right : partner.left) : null;
    const verdict = verdictByLeft.get(side === "left" ? id : (partnerId ?? "")) ?? null;
    const isSelected = selected?.side === side && selected.id === id;
    const key = portKey(side, id);

    return (
      <button
        key={key}
        type="button"
        disabled={locked}
        aria-pressed={isSelected}
        aria-label={`${plainText(text)}, ${partnerText ? `matched with ${partnerText}` : "not matched"}${
          verdict ? (verdict === "correct" ? ", correct" : ", incorrect") : ""
        }`}
        onClick={() => tap(side, id)}
        className={`relative flex min-h-12 w-full items-center gap-2 rounded-control border-2 px-3 py-2 text-left text-small font-medium transition-colors disabled:cursor-default sm:text-body ${
          side === "right" ? "pl-4" : "pr-4"
        } ${itemClasses(isSelected, Boolean(partnerId), verdict)}`}
      >
        {side === "right" && verdict === "correct" && <CheckIcon className="size-4 shrink-0 text-success" />}
        {side === "right" && verdict === "wrong" && <XIcon className="size-4 shrink-0 text-danger" />}
        <span className="min-w-0 flex-1 break-words">
          <InlineText>{text}</InlineText>
        </span>
        {side === "left" && verdict === "correct" && <CheckIcon className="size-4 shrink-0 text-success" />}
        {side === "left" && verdict === "wrong" && <XIcon className="size-4 shrink-0 text-danger" />}
        <span
          aria-hidden="true"
          ref={(el) => {
            if (el) portEls.current.set(key, el);
            else portEls.current.delete(key);
          }}
          className={`absolute top-1/2 size-3 -translate-y-1/2 rounded-node border-2 ${
            side === "left" ? "-right-[7px]" : "-left-[7px]"
          } ${portClasses(Boolean(partnerId), verdict)}`}
        />
      </button>
    );
  }

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <p className="mt-2 text-small text-ink-muted">
        Tap a left item, then its match.
      </p>

      <div ref={containerRef} className="relative mt-6 grid grid-cols-2 gap-x-9 sm:gap-x-14">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          {Object.entries(answer).map(([leftId, rightId]) => {
            const a = ports[portKey("left", leftId)];
            const b = ports[portKey("right", rightId)];
            if (!a || !b) return null;
            const verdict = verdictByLeft.get(leftId);
            return (
              <line
                key={leftId}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  verdict === "correct"
                    ? "var(--color-success)"
                    : verdict === "wrong"
                      ? "var(--color-danger)"
                      : "var(--color-accent-ink)"
                }
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={verdict === "wrong" ? "5 5" : undefined}
              />
            );
          })}
        </svg>
        <div role="group" aria-label="Items to match" className="flex flex-col gap-2.5">
          {card.pairs.map((p) => renderItem("left", p.id))}
        </div>
        <div role="group" aria-label="Possible matches" className="flex flex-col gap-2.5">
          {rightOrder.map((id) => renderItem("right", id))}
        </div>
      </div>

      <CardStatusNote
        status={status}
        correctText="Every pair is connected correctly"
        incorrectText={`${wrongCount} of ${card.pairs.length} pairs ${wrongCount === 1 ? "is" : "are"} wrong`}
      />
    </div>
  );
}
