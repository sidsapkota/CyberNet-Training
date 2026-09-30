"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex touch-none items-center gap-3 rounded-control border-2 px-3 py-3 select-none ${tone} ${
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

export function DragToOrderCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<DragToOrderCard, DragToOrderAnswer>) {
  const labels = new Map(card.items.map((item) => [item.id, item.label]));
  const [dragging, setDragging] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Only Space picks items up, so Enter stays free to check the answer.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(false);
    if (!over || active.id === over.id) return;
    const from = answer.indexOf(String(active.id));
    const to = answer.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onAnswerChange(arrayMove(answer, from, to));
  }

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <DndContext
        id={`dnd-${card.id}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={() => setDragging(true)}
        onDragCancel={() => setDragging(false)}
        onDragEnd={handleDragEnd}
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
      <p className="mt-4 text-caption text-ink-faint">
        Drag to reorder. With a keyboard: focus an item, press Space to pick it up, move it with the
        arrow keys, then press Space to drop it.
      </p>
    </div>
  );
}
