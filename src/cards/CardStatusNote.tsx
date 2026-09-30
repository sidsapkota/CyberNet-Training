import { CheckIcon, XIcon } from "@/components/ui/icons";
import type { CardStatus } from "./types";

/**
 * Icon + text statement of right/wrong inside a card, so correctness never relies on colour
 * alone. Renders nothing while the learner is still answering.
 */
export function CardStatusNote({
  status,
  correctText,
  incorrectText,
}: {
  status: CardStatus;
  correctText: string;
  incorrectText: string;
}) {
  if (status === "answering") return null;
  const correct = status === "correct";
  return (
    <p
      className={`mt-4 inline-flex items-center gap-2 rounded-control px-3 py-1.5 text-small font-semibold ${
        correct ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {correct ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
      {correct ? correctText : incorrectText}
    </p>
  );
}
