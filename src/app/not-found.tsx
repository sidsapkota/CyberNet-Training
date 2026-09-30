import { Mascot } from "@/components/mascot/Mascot";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lesson flex-col items-center justify-center px-gutter text-center">
      <Mascot expression="presenting" size={150} />
      <p className="mt-6 font-mono text-caption tracking-widest text-ink-faint uppercase">Error 404 · no route</p>
      <h1 className="mt-2 text-headline font-semibold">We couldn&apos;t reach that page</h1>
      <p className="mt-2 text-ink-muted">It may have moved or never existed.</p>
      <ButtonLink href="/" className="mt-8">
        Back to the dashboard
      </ButtonLink>
    </main>
  );
}
