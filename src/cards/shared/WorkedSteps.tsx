import { Markdown } from "@/components/ui/Markdown";

/**
 * A worked example's steps (content quality pass: worked example, then fade). Short numbered lines
 * under the question: all of them on the solved card, the first few on the half-done one, none on
 * the card the learner does alone.
 */
export function WorkedSteps({ steps }: { steps: readonly string[] }) {
  return (
    <ol aria-label="Worked steps" className="mt-2 space-y-0.5 text-small text-ink-muted">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2">
          <span className="font-mono text-ink-faint tabular-nums">{i + 1}.</span>
          <Markdown className="min-w-0 flex-1">{step}</Markdown>
        </li>
      ))}
    </ol>
  );
}
