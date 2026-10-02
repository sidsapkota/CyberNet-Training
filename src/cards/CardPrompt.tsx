import { Markdown } from "@/components/ui/Markdown";

/** The question text at the top of every interactive card. Follow-up paragraphs render as hints. */
export function CardPrompt({ children, id }: { children: string; id?: string }) {
  return (
    <div id={id}>
      <Markdown className="text-lead font-semibold text-balance text-ink sm:text-title [&_p]:mb-3 [&_p+p]:text-small [&_p+p]:font-normal sm:[&_p+p]:text-body [&_p+p]:text-ink-muted">
        {children}
      </Markdown>
    </div>
  );
}
