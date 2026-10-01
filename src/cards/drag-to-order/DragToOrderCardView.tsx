"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { CheckIcon, GripIcon, XIcon } from "@/components/ui/icons";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import { InlineText } from "../shared/InlineText";
import { plainText } from "../shared/text";
import type { CardComponentProps, CardStatus } from "../types";
import type { DragToOrderAnswer, DragToOrderCard } from "./schema";

const BINARY_LIKE = /^[01\s.]+$/;

function SortableItem({
  id,
  label,
  position,
  status,
}: {
  id: string;
  label: string;
  position: number;
  status: CardStatus;
}) {
  const locked = status !== "answering";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: locked,
  });

  const tone =
    status === "correct"
      ? "border-success bg-success-soft"
      : status === "incorrect"
        ? "border-danger bg-danger-soft"
        : isDragging
          ? "border-accent-ink bg-surface shadow-lift"
          : "border-line bg-surface hover:border-line-strong";

  return (
    <li
      ref={setNodeRef}
      data-drag-item
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex touch-manipulation items-center gap-3 rounded-control border-2 px-3 py-3 select-none ${tone} ${
        isDragging ? "z-10 scale-[1.02]" : ""
      } ${locked ? "" : "cursor-grab active:cursor-grabbing"} transition-[border-color,background-color,box-shadow]`}
      {...attributes}
      {...listeners}
      aria-roledescription="sortable item"
      aria-label={`${plainText(label)}, position ${position}`}
    >
      <span
        aria-hidden="true"
        className="relative z-10 grid size-7 shrink-0 place-items-center rounded-node border-2 border-line-strong bg-surface font-mono text-caption font-semibold text-ink-muted"
      >
        {position}
      </span>
      <span
        className={`flex-1 font-medium ${BINARY_LIKE.test(label) ? "font-mono text-lead tracking-wide" : "text-body"}`}
      >
        <InlineText>{label}</InlineText>
      </span>
      {!locked && <GripIcon className="size-5 shrink-0 text-ink-faint" />}
      {status === "correct" && <CheckIcon className="size-5 shrink-0 text-success" />}
      {status === "incorrect" && <XIcon className="size-5 shrink-0 text-danger" />}
    </li>
  );
}

const TIP_KEY = "cybernet.tip.dragHold";

/**
 * The one-line "press and hold" tip, until the learner's first drag (remembered per device).
 */
function useFirstDragTip() {
  // Cards render only in the browser (after progress loads), so storage and the pointer type can
  // be read straight away.
  const [state] = useState<{ show: boolean; touch: boolean }>(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(TIP_KEY) === "1";
    } catch {
      // storage blocked: show it
    }
    return { show: !seen, touch: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches };
  });
  const done = () => {
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      // ignore
    }
  };
  return { ...state, done };
}

export function DragToOrderCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<DragToOrderCard, DragToOrderAnswer>) {
  const labels = new Map(card.items.map((item) => [item.id, item.label]));
  const [dragging, setDragging] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // On touch, press and hold briefly to pick an item up, so a swipe over the list still scrolls
    // the page (a long list can fill a phone screen).
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Only Space picks items up, so Enter stays free to check the answer.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const tip = useFirstDragTip();
  const say = (id: string | number) => plainText(labels.get(String(id)) ?? "the item");

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(false);
    tip.done();
    if (!over || active.id === over.id) return;
    const from = answer.indexOf(String(active.id));
    const to = answer.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onAnswerChange(arrayMove(answer, from, to));
  }

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      {tip.show && status === "answering" && (
        <p className="mt-3 flex items-center gap-2 text-small font-semibold text-ink">
          <GripIcon className="size-4 shrink-0 text-ink-muted" />
          {tip.touch ? "Press and hold an item, then drag it." : "Drag an item to move it."}
        </p>
      )}
      <DndContext
        id={`dnd-${card.id}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={() => setDragging(true)}
        onDragCancel={() => setDragging(false)}
        onDragEnd={handleDragEnd}
        // Announce items by their label and position, never their ids (an id like "sixteen" could
        // give the answer away on a binary card).
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up ${say(active.id)}, position ${answer.indexOf(String(active.id)) + 1} of ${answer.length}.`,
            onDragOver: ({ active, over }) => (over ? `${say(active.id)} is over position ${answer.indexOf(String(over.id)) + 1}.` : `${say(active.id)} is no longer over a position.`),
            onDragEnd: ({ active, over }) => (over ? `${say(active.id)} dropped at position ${answer.indexOf(String(over.id)) + 1}.` : `${say(active.id)} dropped.`),
            onDragCancel: ({ active }) => `Moving ${say(active.id)} cancelled.`,
          },
        }}
      >
        <SortableContext items={answer} strategy={verticalListSortingStrategy}>
          {/* While an item is held, Enter drops it instead of checking the answer. */}
          <ol
            // The trace linking the position nodes, drawn behind the items.
            className="relative mt-8 grid gap-2.5 before:absolute before:top-6 before:bottom-6 before:left-[27px] before:w-0.5 before:bg-line"
            data-keyboard-passthrough={dragging ? "" : undefined}
          >
            {answer.map((id, i) => (
              <SortableItem
                key={id}
                id={id}
                label={labels.get(id) ?? id}
                position={i + 1}
                status={status}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <CardStatusNote
        status={status}
        correctText="Correct order"
        incorrectText="Not the right order"
      />
      <p className="mt-4 text-caption text-ink-faint pointer-coarse:hidden">
        Drag to reorder. With a keyboard: focus an item, press Space to pick it up, move it with the
        arrow keys, then press Space to drop it.
      </p>
    </div>
  );
}
