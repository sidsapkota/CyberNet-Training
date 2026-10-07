import type { Metadata } from "next";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false } };

/** After the one-tap unsubscribe link in a reminder email (src/app/api/email/unsubscribe). */
export default async function UnsubscribedPage({ searchParams }: PageProps<"/unsubscribed">) {
  const { unknown } = await searchParams;
  return (
    <main className="mx-auto flex max-w-lesson flex-col items-center px-gutter py-16 text-center">
      <NetworkMark mode="dim" className="size-18" />
      <h1 className="mt-6 text-headline font-semibold">{unknown ? "Link not recognised" : "You're unsubscribed"}</h1>
      <p className="mt-3 text-body text-ink-muted">
        {unknown
          ? "That unsubscribe link didn't match an account. You can turn reminder emails off in your account settings."
          : "You won't get reminder emails from CyberNet Training any more. You can turn them back on in your account settings."}
      </p>
      <ButtonLink href="/account" variant="secondary" className="mt-8">
        Account settings
      </ButtonLink>
    </main>
  );
}
