import Link from "next/link";
import { FeedbackIcon } from "@/components/ui/icons";

const link = "inline-flex min-h-11 items-center gap-1.5 text-small text-ink-muted underline-offset-2 hover:text-ink hover:underline";

/** Quiet footer on pages with the site header: privacy, terms and feedback. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <nav
        aria-label="Site"
        className="mx-auto flex max-w-wide flex-wrap items-center justify-center gap-x-6 gap-y-1 px-gutter py-4"
      >
        <Link href="/privacy" className={link}>
          Privacy
        </Link>
        <Link href="/terms" className={link}>
          Terms
        </Link>
        <Link href="/feedback" className={link}>
          <FeedbackIcon className="size-4" /> Send feedback
        </Link>
      </nav>
    </footer>
  );
}
