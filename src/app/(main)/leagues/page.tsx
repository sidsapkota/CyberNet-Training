import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LeaguesView } from "@/components/leagues/LeaguesView";
import { signedInUserId } from "@/lib/auth/session";
import { getCourses } from "@/lib/content/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leagues", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Hidden (404) until leagues open; leagues need an account, so guests sign in first. */
async function leaguesOpen(): Promise<boolean> {
  try {
    const { data, error } = await (await createSupabaseServerClient()).rpc("leagues_open");
    return !error && data === true;
  } catch {
    return false; // no Supabase settings: guest-only copy, no leagues
  }
}

export default async function LeaguesPage() {
  if (!(await leaguesOpen())) notFound();
  if (!(await signedInUserId())) redirect("/login?next=/leagues");
  return (
    <main className="px-gutter py-6 sm:py-10">
      <LeaguesView courses={getCourses()} />
    </main>
  );
}
