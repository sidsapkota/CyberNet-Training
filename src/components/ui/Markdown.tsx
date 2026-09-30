import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
  code: ({ children }) => (
    <code className="rounded-sm border border-line bg-surface-raised px-1.5 py-px font-mono text-[0.92em] text-ink">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a href={href} className="font-medium text-accent-ink underline underline-offset-2">
      {children}
    </a>
  ),
};

/** Renders lesson markdown. Raw HTML is ignored, so content can't inject markup. */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
