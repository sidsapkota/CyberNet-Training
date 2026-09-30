import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lesson flex-col items-center justify-center px-gutter text-center">
      <p className="font-mono text-6xl font-bold text-ink-faint">404</p>
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-ink-muted">The lesson may have moved or never existed.</p>
      <ButtonLink href="/" className="mt-8">
        Back to courses
      </ButtonLink>
    </main>
  );
}
