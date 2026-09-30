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
import { GripIcon } from "@/components/ui/icons";
import { CardPrompt } from "../CardPrompt";
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
          ? "border-primary bg-surface shadow-lift"
          : "border-line bg-surface hover:border-line-strong";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex touch-none items-center gap-3 rounded-control border-2 px-3 py-3 select-none sm:px-4 ${tone} ${
        isDragging ? "z-10 scale-[1.02]" : ""
      } ${locked ? "" : "cursor-grab active:cursor-grabbing"} transition-[border-color,background-color,box-shadow]`}
      {...attributes}
      {...listeners}
      aria-roledescription="sortable item"
      aria-label={`${label}, position ${position}`}
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-sm font-bold text-ink-muted"
      >
        {position}
      </span>
      <span
        className={`flex-1 text-base font-medium sm:text-lg ${BINARY_LIKE.test(label) ? "font-mono tracking-wider" : ""}`}
      >
        {label}
      </span>
      {!locked && <GripIcon className="size-5 shrink-0 text-ink-faint" />}
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
          <ol className="mt-8 grid gap-3" data-keyboard-passthrough={dragging ? "" : undefined}>
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
      <p className="mt-4 text-sm text-ink-faint">
        Drag to reorder. With a keyboard: focus an item, press Space to pick it up, move it with the
        arrow keys, then press Space to drop it.
      </p>
    </div>
  );
}
