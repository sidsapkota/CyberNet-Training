import Image from "next/image";
import { Markdown } from "@/components/ui/Markdown";
import type { PhotoCard } from "./schema";

/**
 * A real photo with its caption and credit. The file is stored unmodified; next/image only
 * scales it for the screen. The credit line names the author and licence and links to the
 * source, as the licences require.
 */
export function PhotoCardView({ card }: { card: PhotoCard }) {
  const { photo, credit } = card;
  return (
    <article>
      <h2 className="text-title font-semibold text-balance sm:text-headline">{card.title}</h2>
      <figure className="mt-4 overflow-hidden sm:mt-6 rounded-card border border-line bg-surface">
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="(min-width: 768px) 640px, 100vw"
          className="mx-auto h-auto max-h-[min(60dvh,calc(100dvh-24rem))] w-auto max-w-full object-contain"
          priority
        />
        <figcaption className="border-t border-line px-4 py-3">
          <Markdown className="text-body text-ink">{card.caption}</Markdown>
          <p className="mt-2 text-caption text-ink-faint">
            Photo: {credit.author},{" "}
            <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2 hover:text-ink">
              {credit.licence}
            </a>
            , via{" "}
            <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              Wikimedia Commons
            </a>
            . Unmodified.
          </p>
        </figcaption>
      </figure>
    </article>
  );
}
