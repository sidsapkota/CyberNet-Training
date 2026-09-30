import { Markdown } from "@/components/ui/Markdown";

/** The question text at the top of every interactive card. */
export function CardPrompt({ children, id }: { children: string; id?: string }) {
  return (
    <div id={id}>
      <Markdown className="text-xl font-semibold leading-snug text-balance sm:text-2xl [&_p]:mb-3 [&_p+p]:text-lg [&_p+p]:font-normal [&_p+p]:text-ink-muted">
        {children}
      </Markdown>
    </div>
  );
}
