import { Markdown } from "@/components/ui/Markdown";

/** A plain, readable legal page: comfortable line length, clear headings, brand tokens only. */
export function LegalArticle({ markdown }: { markdown: string }) {
  return (
    <main className="mx-auto max-w-lesson px-gutter py-8 sm:py-12">
      <Markdown className="text-body text-ink [&_em]:text-small [&_em]:text-ink-muted [&_h1]:mb-2 [&_h1]:text-headline [&_h1]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-title [&_h2]:font-semibold [&_li]:text-ink">
        {markdown}
      </Markdown>
    </main>
  );
}
