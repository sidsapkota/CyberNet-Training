import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeCreatorView } from "@/components/challenge/ChallengeCreatorView";
import { ChallengePlay } from "@/components/challenge/ChallengePlay";
import { score } from "@/lib/challenges/rules";
import { attemptsFor, getChallenge } from "@/lib/challenges/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * A challenge link (/c/<id>): anyone can play it, no account needed. The page shows only the
 * challenger's username and avatar. The challenger opening their own link sees who played instead.
 * Never indexed (robots.txt disallows /c/ too).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(id).catch(() => null);
  return {
    title: challenge ? `Can you beat ${challenge.creator.username}?` : "Challenge",
    description: challenge ? `A quick ${challenge.cards.length}-question challenge on ${challenge.lessonTitle}. No account needed.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function ChallengePage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const challenge = await getChallenge(id);
  if (!challenge || challenge.cards.length === 0) notFound();

  // Is this the challenger? (The verified session, never a value from the browser.)
  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    viewerId = null; // no accounts on this copy
  }

  if (viewerId === challenge.creatorId) {
    return (
      <ChallengeCreatorView
        id={challenge.id}
        lessonTitle={challenge.lessonTitle}
        courseId={challenge.courseId}
        score={score(challenge.results)}
        total={challenge.cards.length}
        attempts={await attemptsFor(challenge.id)}
        expired={challenge.expired}
      />
    );
  }

  const { creatorId: _creator, ...forPlay } = challenge;
  void _creator; // never sent to the browser
  return <ChallengePlay challenge={forPlay} />;
}
