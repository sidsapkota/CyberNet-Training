import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChallengeCreate } from "@/components/challenge/ChallengeCreate";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";
import { requireUserId } from "@/lib/auth/server";
import { duelist, mayChallenge, questionsFor } from "@/lib/challenges/server";
import { getLesson } from "@/lib/content/server";

export const metadata: Metadata = { title: "Challenge a friend", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Making a challenge on a finished lesson (signed in). */
export default async function NewChallengePage({ params }: PageProps<"/challenge/new/[lesson]">) {
  const { lesson: lessonId } = await params;
  const lesson = getLesson(lessonId);
  const cards = questionsFor(lessonId);
  if (!lesson || !cards) notFound();
  const userId = await requireUserId().catch(() => null);
  if (!userId) redirect(`/login?next=${encodeURIComponent(`/challenge/new/${lessonId}`)}`);

  if (!(await mayChallenge(userId, lessonId))) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lesson flex-col items-center justify-center px-gutter text-center">
        <NetworkMark mode="dim" className="size-16" />
        <h1 className="mt-6 text-title font-semibold">Finish the lesson first</h1>
        <p className="mt-2 text-ink-muted">Then you can challenge a friend on {lesson.title}.</p>
        <ButtonLink href={`/lesson/${lessonId}`} className="mt-8">
          Go to the lesson
        </ButtonLink>
      </main>
    );
  }

  return (
    <ChallengeCreate
      lessonId={lessonId}
      lessonTitle={lesson.title}
      courseId={lesson.courseId}
      cards={cards}
      me={await duelist(userId)}
    />
  );
}
