import Image from "next/image";
import { Markdown } from "@/components/ui/Markdown";
import type { ExplainerCard } from "./schema";

export function ExplainerCardView({ card }: { card: ExplainerCard }) {
  return (
    <article>
      <h2 className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
        {card.title}
      </h2>
      {card.image && (
        <figure className="mt-6 overflow-hidden rounded-card border border-line bg-surface-muted p-4 sm:p-6">
          <Image
            src={card.image.src}
            alt={card.image.alt}
            width={card.image.width}
            height={card.image.height}
            className="mx-auto h-auto w-full max-w-md"
            priority
            unoptimized={card.image.src.endsWith(".svg")}
          />
          {card.image.caption && (
            <figcaption className="mt-3 text-center text-sm text-ink-muted">
              {card.image.caption}
            </figcaption>
          )}
        </figure>
      )}
      <Markdown className="mt-6 text-lg leading-relaxed text-ink-muted">{card.body}</Markdown>
    </article>
  );
}
