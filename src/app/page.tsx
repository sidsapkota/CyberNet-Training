import { CourseList } from "@/components/home/CourseList";
import { ResetProgressButton } from "@/components/home/ResetProgressButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { XpPill } from "@/components/XpPill";
import { getCourses } from "@/lib/content/server";

export default function HomePage() {
  const courses = getCourses();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-page items-center gap-3 px-gutter py-3">
          <div className="flex flex-1 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-control bg-primary font-mono text-sm font-bold text-on-primary"
            >
              01
            </span>
            <span className="text-lg font-bold tracking-tight">CyberNet Training</span>
          </div>
          <XpPill />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-page px-gutter pt-10 pb-section sm:pt-14">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Learn how technology really works
          </h1>
          <p className="mt-3 text-lg text-ink-muted">
            Short, hands-on lessons on computers, networks and security. No experience needed.
          </p>
        </div>

        <CourseList courses={courses} />

        <footer className="mt-section flex justify-center border-t border-line pt-6">
          <ResetProgressButton />
        </footer>
      </main>
    </div>
  );
}
