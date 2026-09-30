import ReactMarkdown, { type Components, defaultUrlTransform } from "react-markdown";
import { glossaryMarksToLinks } from "@/lib/glossary";
import { GlossaryTerm } from "./GlossaryTerm";

const GLOSSARY = "glossary:";
/** Glossary links survive; everything else gets react-markdown's usual URL safety filter. */
const urlTransform = (url: string) => (url.startsWith(GLOSSARY) ? url : defaultUrlTransform(url));

const components: Components = {
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
  // Long values (IPv6 addresses, URLs) may wrap anywhere, so they never push the page sideways.
  code: ({ children }) => (
    <code className="rounded-sm border border-line bg-surface-raised px-1.5 py-px font-mono text-[0.92em] text-ink [overflow-wrap:anywhere]">
      {children}
    </code>
  ),
  pre: ({ children }) => <pre className="mb-4 max-w-full overflow-x-auto last:mb-0">{children}</pre>,
  a: ({ children, href }) =>
    href?.startsWith(GLOSSARY) ? (
      <GlossaryTerm id={href.slice(GLOSSARY.length)}>{children}</GlossaryTerm>
    ) : (
      <a href={href} className="font-medium text-accent-ink underline underline-offset-2">
        {children}
      </a>
    ),
};

/**
 * Renders lesson markdown. Raw HTML is ignored, so content can't inject markup. Glossary marks
 * (`[[router]]`, see src/lib/glossary.ts) become tappable definitions.
 */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown components={components} skipHtml urlTransform={urlTransform}>
        {glossaryMarksToLinks(children)}
      </ReactMarkdown>
    </div>
  );
}
