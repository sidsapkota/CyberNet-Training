"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useFeedback } from "@/lib/feedback";
import { PRESS_SPRING } from "@/lib/motion";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import { InlineText } from "../shared/InlineText";
import type { CardComponentProps } from "../types";
import { keepCorrect, placeItem, trayOrder, unplaceItem } from "./grade";
import type { SortBinsAnswer, SortBinsCard } from "./schema";

const TRAY = "__tray__";

type Item = SortBinsCard["items"][number];

function ItemChip({
  item,
  selected,
  locked,
  result,
  onTap,
}: {
  item: Item;
  selected: boolean;
  locked: boolean;
  result: "correct" | "incorrect" | null;
  onTap: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: locked });
  const tone =
    result === "correct"
      ? "border-success bg-success-soft text-ink"
      : result === "incorrect"
        ? "border-danger bg-danger-soft text-ink"
        : selected
          ? "border-accent-ink bg-accent-soft text-ink shadow-glow"
          : "border-line-strong bg-surface text-ink hover:border-accent-ink";
  return (
    <motion.button
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      type="button"
      layout={!reduceMotion}
      layoutId={reduceMotion ? undefined : `sort-${item.id}`}
      transition={PRESS_SPRING}
      data-keyboard-passthrough
      aria-pressed={locked ? undefined : selected}
      aria-label={`${item.label}${result ? (result === "correct" ? ", correct" : ", wrong bin") : selected ? ", selected" : ""}`}
      disabled={locked}
      onClick={onTap}
      style={{ opacity: isDragging ? 0.35 : 1, touchAction: "none" }}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-control border-2 px-3 py-1.5 text-left text-small font-semibold transition-colors disabled:cursor-default ${tone}`}
    >
      {result === "correct" && <CheckIcon className="size-4 shrink-0 text-success" strokeWidth={2.5} />}
      {result === "incorrect" && <XIcon className="size-4 shrink-0 text-danger" strokeWidth={2.5} />}
      <InlineText>{item.label}</InlineText>
    </motion.button>
  );
}

function Bin({
  id,
  label,
  children,
  canDrop,
  onPlace,
  selectedLabel,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  canDrop: boolean;
  onPlace: () => void;
  selectedLabel: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`flex min-h-32 flex-col rounded-card border-2 border-dashed p-2 transition-colors ${
        isOver || canDrop ? "border-accent-ink bg-accent-soft" : "border-line-strong bg-surface-raised"
      }`}
    >
      <button
        type="button"
        data-keyboard-passthrough
        disabled={!canDrop}
        onClick={onPlace}
        aria-label={selectedLabel ? `Put ${selectedLabel} in ${label}` : label}
        className="rounded-control px-2 py-1.5 text-left font-mono text-caption font-semibold tracking-wider text-ink-muted uppercase enabled:text-accent-ink enabled:hover:bg-surface disabled:cursor-default"
      >
        {label}
      </button>
      <div className="mt-1 flex flex-1 flex-wrap content-start gap-1.5">{children}</div>
    </section>
  );
}

export function SortBinsCardView({ card, answer, onAnswerChange, status }: CardComponentProps<SortBinsCard, SortBinsAnswer>) {
  const locked = status !== "answering";
  const feedback = useFeedback();
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const items = trayOrder(card);
  const byId = new Map(card.items.map((i) => [i.id, i]));

  // After a wrong answer, Try again sends the wrong items back to the tray.
  const previous = useRef(status);
  useEffect(() => {
    if (previous.current === "incorrect" && status === "answering") onAnswerChange(keepCorrect(card, answer));
    previous.current = status;
  }, [status, card, answer, onAnswerChange]);

  function place(itemId: string, binId: string) {
    if (binId === TRAY) onAnswerChange(unplaceItem(answer, itemId));
    else {
      onAnswerChange(placeItem(answer, itemId, binId));
      feedback.play("snap");
      feedback.haptic("tap");
    }
    setSelected(null);
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(String(event.active.id));
  }
  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    if (event.over) place(String(event.active.id), String(event.over.id));
  }

  const result = (item: Item) => (locked && answer[item.id] ? (answer[item.id] === item.bin ? "correct" : "incorrect") : null);
  const chip = (item: Item) => (
    <ItemChip
      key={item.id}
      item={item}
      locked={locked}
      selected={selected === item.id}
      result={result(item)}
      onTap={() => {
        if (answer[item.id] && selected !== item.id) {
          // Tapping a placed item picks it back up.
          onAnswerChange(unplaceItem(answer, item.id));
          setSelected(item.id);
        } else setSelected(selected === item.id ? null : item.id);
      }}
    />
  );
  const tray = items.filter((i) => !answer[i.id]);
  const selectedLabel = selected ? (byId.get(selected)?.label ?? null) : null;
  const allCorrect = status === "correct";

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <p className="mt-2 text-small text-ink-muted">Tap an item, then tap a bin. Or drag it.</p>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <LayoutGroup id={card.id}>
          <TrayZone empty={tray.length === 0} locked={locked}>
            {tray.map(chip)}
          </TrayZone>
          <div className={`mt-4 grid gap-2 ${card.bins.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {card.bins.map((bin) => (
              <Bin
                key={bin.id}
                id={bin.id}
                label={bin.label}
                canDrop={!locked && selected !== null}
                onPlace={() => selected && place(selected, bin.id)}
                selectedLabel={selectedLabel}
              >
                {items.filter((i) => answer[i.id] === bin.id).map(chip)}
              </Bin>
            ))}
          </div>
        </LayoutGroup>
        <DragOverlay dropAnimation={null}>
          {dragging && byId.get(dragging) ? (
            <span className="inline-flex min-h-11 items-center rounded-control border-2 border-accent-ink bg-accent-soft px-3 py-1.5 text-small font-semibold text-ink shadow-lift">
              <InlineText>{byId.get(dragging)!.label}</InlineText>
            </span>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardStatusNote
        status={status}
        correctText="Everything's in the right bin"
        incorrectText={allCorrect ? "" : "Some items are in the wrong bin"}
      />
    </div>
  );
}

function TrayZone({ children, empty, locked }: { children: React.ReactNode; empty: boolean; locked: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY });
  return (
    <div
      ref={setNodeRef}
      aria-label="Items to sort"
      role="group"
      className={`mt-5 flex min-h-14 flex-wrap gap-2 rounded-card p-2 transition-colors ${isOver ? "bg-surface-raised" : ""}`}
    >
      {children}
      {empty && !locked && <span className="self-center px-1 text-small text-ink-faint">All sorted. Press Check.</span>}
    </div>
  );
}
