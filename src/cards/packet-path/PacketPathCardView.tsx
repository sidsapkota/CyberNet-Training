"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ComponentType, useSyncExternalStore } from "react";
import {
  CheckIcon,
  DeviceIcon,
  InternetIcon,
  RetryIcon,
  RouterIcon,
  ServerIcon,
  SwitchIcon,
  UndoIcon,
  XIcon,
} from "@/components/ui/icons";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps } from "../types";
import { canAddHop, firstWrongHop, layoutNetwork, tapNode } from "./grade";
import type { NetworkNodeKind, PacketPathAnswer, PacketPathCard } from "./schema";

const KIND: Record<NetworkNodeKind, { Icon: ComponentType<{ className?: string }>; name: string }> = {
  device: { Icon: DeviceIcon, name: "device" },
  router: { Icon: RouterIcon, name: "router" },
  switch: { Icon: SwitchIcon, name: "switch" },
  server: { Icon: ServerIcon, name: "server" },
  internet: { Icon: InternetIcon, name: "the internet" },
};

/** Row height in px: node (48) + label + optional address. Phones use shorter rows. */
const ROW_H = 120;
const ROW_H_NARROW = 80;
/** Node centre offset from the top of its row. */
const NODE_Y = 28;
const HOP_SECONDS = 0.22;

const NARROW_QUERY = "(max-width: 520px)";
function subscribeNarrow(onChange: () => void) {
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function PacketPathCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<PacketPathCard, PacketPathAnswer>) {
  const reduceMotion = useReducedMotion();
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
  const locked = status !== "answering";
  // Never rotated: a 4-column network fits a phone at about 82px a column, while rotating it made
  // 4 tall rows that pushed the stops below the fold. Phones get shorter rows instead.
  const layout = layoutNetwork(card, false);
  const rowH = narrow ? ROW_H_NARROW : ROW_H;
  const placed = new Map(layout.nodes.map((n) => [n.id, n]));
  const byId = new Map(card.nodes.map((n) => [n.id, n]));

  const xPct = (id: string) => (((placed.get(id)?.col ?? 0) + 0.5) / layout.cols) * 100;
  const yPx = (id: string) => (placed.get(id)?.row ?? 0) * rowH + NODE_Y;
  const height = layout.rows * rowH;

  const finished = answer.at(-1) === card.destination;
  const wrongAt = locked ? firstWrongHop(card, answer) : null;
  const travelled = wrongAt === null ? answer : answer.slice(0, wrongAt + 1);
  const travelSeconds = reduceMotion ? 0 : Math.min(1.2, HOP_SECONDS * Math.max(0, travelled.length - 1));

  const inPath = (a: string, b: string) =>
    answer.some((id, i) => i > 0 && ((answer[i - 1] === a && id === b) || (answer[i - 1] === b && id === a)));

  const downIds = new Set(card.nodes.filter((n) => n.down).map((n) => n.id));
  function linkStroke(a: string, b: string) {
    if (!inPath(a, b)) {
      // Links to a node that's down are dashed, so the outage is visible, not just in its label.
      return downIds.has(a) || downIds.has(b)
        ? { stroke: "var(--color-line-strong)", width: 2, dash: "4 6" }
        : { stroke: "var(--color-line-strong)", width: 2, dash: undefined };
    }
    if (locked && wrongAt !== null) {
      const ia = answer.indexOf(a);
      const ib = answer.indexOf(b);
      if (Math.max(ia, ib) === wrongAt) return { stroke: "var(--color-danger)", width: 3, dash: "6 6" };
      if (Math.max(ia, ib) > wrongAt) return { stroke: "var(--color-line-strong)", width: 2, dash: "2 6" };
    }
    return { stroke: "var(--color-accent-ink)", width: 3, dash: undefined };
  }

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <p className="mt-2 text-small text-ink-muted">
        Tap each next stop along a line, from <strong className="font-semibold text-ink">{byId.get(card.source)?.label}</strong>.
      </p>

      <div
        role="group"
        aria-label="Network diagram"
        className="relative mt-3 w-full rounded-card border border-line bg-surface sm:mt-6"
        style={{ height: height + 8 }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox={`0 0 1000 ${height + 8}`}
          preserveAspectRatio="none"
        >
          {card.links.map((l) => {
            const s = linkStroke(l.from, l.to);
            return (
              <line
                key={`${l.from}-${l.to}`}
                x1={xPct(l.from) * 10}
                y1={yPx(l.from)}
                x2={xPct(l.to) * 10}
                y2={yPx(l.to)}
                stroke={s.stroke}
                strokeWidth={s.width}
                strokeDasharray={s.dash}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {card.nodes.map((node) => {
          const { Icon, name } = KIND[node.kind];
          const step = answer.indexOf(node.id);
          const isLast = step === answer.length - 1 && step > 0;
          const selectable = !locked && canAddHop(card, answer, node.id);
          const actionable = !locked && (selectable || isLast);
          const isWrong = wrongAt !== null && step === wrongAt;
          const reachedCorrectly = status === "correct" && node.id === card.destination;

          const down = Boolean(node.down);
          const tone = isWrong
            ? "border-danger bg-danger-soft text-danger"
            : down && step < 0
              ? "border-dashed border-danger bg-surface text-danger"
            : reachedCorrectly
              ? "border-success bg-success text-on-success"
              : step >= 0
                ? "border-accent-ink bg-accent text-on-accent shadow-glow"
                : selectable
                  ? "border-accent-ink bg-surface text-accent-ink hover:bg-accent-soft"
                  : "border-line-strong bg-surface text-ink-muted";

          const role =
            node.id === card.source ? "start" : node.id === card.destination ? "destination" : null;
          const state =
            step >= 0 ? `stop ${step + 1} of your route` : selectable ? "can be the next stop" : "not reachable from here";
          const downNote = down ? ", down (not working)" : "";

          return (
            <div
              key={node.id}
              className="absolute flex w-[calc(100%/var(--cols))] -translate-x-1/2 flex-col items-center px-1 text-center"
              style={{ left: `${xPct(node.id)}%`, top: yPx(node.id) - 24, ["--cols" as string]: layout.cols }}
            >
              <button
                type="button"
                disabled={!actionable}
                onClick={() => onAnswerChange(tapNode(card, answer, node.id))}
                aria-label={`${node.label}${node.address ? `, ${node.address}` : ""}, ${name}${
                  role ? `, ${role}` : ""
                }${downNote}, ${state}${isWrong ? ", wrong stop" : ""}`}
                className={`relative grid size-11 place-items-center rounded-node border-2 transition-colors disabled:cursor-default sm:size-12 ${tone}`}
              >
                <Icon className="size-5" />
                {down && !isWrong && (
                  <span className="absolute -bottom-1.5 -right-1.5 grid size-5 place-items-center rounded-node border-2 border-danger bg-surface text-danger">
                    <XIcon className="size-3" strokeWidth={3} />
                  </span>
                )}
                {step > 0 && !isWrong && !reachedCorrectly && (
                  <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-node border border-accent-ink bg-surface font-mono text-[0.65rem] font-semibold text-accent-ink">
                    {step}
                  </span>
                )}
                {(isWrong || reachedCorrectly) && (
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: travelSeconds, type: "spring", stiffness: 500, damping: 22 }}
                    className={`absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-node border-2 bg-surface ${
                      isWrong ? "border-danger text-danger" : "border-success text-success"
                    }`}
                  >
                    {isWrong ? <XIcon className="size-3" strokeWidth={3} /> : <CheckIcon className="size-3" strokeWidth={3} />}
                  </motion.span>
                )}
              </button>
              <span className="mt-1 rounded-sm bg-surface px-1 text-caption leading-tight font-semibold text-ink">
                {role && (
                  <span className="mr-1 font-mono text-[0.6rem] tracking-wider text-ink-faint uppercase">
                    {role === "start" ? "From" : "To"}
                  </span>
                )}
                {node.label}
              </span>
              {down && (
                <span className="rounded-sm bg-danger-soft px-1 font-mono text-[0.65rem] leading-tight font-semibold tracking-wider text-danger uppercase">
                  down
                </span>
              )}
              {node.address && (
                <span className="rounded-sm bg-surface px-1 font-mono text-[0.68rem] leading-tight break-all text-ink-muted">
                  {node.address}
                </span>
              )}
            </div>
          );
        })}

        {locked && travelled.length > 0 && (
          <motion.span
            key={`${status}-${answer.join(">")}`}
            aria-hidden="true"
            className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-node border-2 border-accent-ink bg-accent shadow-glow"
            initial={{ left: `${xPct(travelled[0] ?? card.source)}%`, top: yPx(travelled[0] ?? card.source), opacity: 1 }}
            animate={{
              left: travelled.map((id) => `${xPct(id)}%`),
              top: travelled.map((id) => yPx(id)),
              opacity: [...travelled.map(() => 1).slice(0, -1), 0],
            }}
            transition={{ duration: travelSeconds, ease: "linear" }}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 font-mono text-small text-ink-muted" aria-live="polite">
          <span className="text-ink-faint">route: </span>
          {answer.map((id) => byId.get(id)?.label ?? id).join(" → ")}
          {!finished && !locked && " → …"}
        </p>
        {!locked && (
          <div className="flex gap-1">
            <button
              type="button"
              data-keyboard-passthrough
              disabled={answer.length <= 1}
              onClick={() => onAnswerChange(answer.slice(0, -1))}
              className="inline-flex min-h-11 items-center gap-1 rounded-control px-2.5 text-small font-semibold text-ink-muted hover:bg-surface-raised hover:text-ink disabled:opacity-40"
            >
              <UndoIcon className="size-4" /> Undo
            </button>
            <button
              type="button"
              data-keyboard-passthrough
              disabled={answer.length <= 1}
              onClick={() => onAnswerChange([card.source])}
              className="inline-flex min-h-11 items-center gap-1 rounded-control px-2.5 text-small font-semibold text-ink-muted hover:bg-surface-raised hover:text-ink disabled:opacity-40"
            >
              <RetryIcon className="size-4" /> Reset
            </button>
          </div>
        )}
      </div>

      <CardStatusNote
        status={status}
        correctText={`The packet reached ${byId.get(card.destination)?.label ?? "its destination"}`}
        incorrectText={
          wrongAt !== null
            ? `The packet went the wrong way at ${byId.get(answer[wrongAt] ?? "")?.label ?? "a hop"}`
            : "That route doesn't work"
        }
      />
    </div>
  );
}
