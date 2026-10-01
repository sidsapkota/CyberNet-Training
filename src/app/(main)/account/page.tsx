import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/AccountPanel";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCourses } from "@/lib/content/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

/**
 * One round trip: the session check (`auth.getUser()`, verified by Supabase Auth) and the profile
 * read go out together. The profile query needs no user id: Row Level Security returns only the
 * signed-in learner's own row (and nothing for a guest, who is sent to sign in).
 */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/login"); // no Supabase settings: no accounts on this copy
  }
  const [{ data: user, error }, { data: profile }, { welcome, next }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name").maybeSingle(),
    searchParams,
  ]);
  if (error || !user.user) redirect("/login");

  return (
    <main className="px-gutter py-8 sm:py-12">
      <AccountPanel
        courseTitles={Object.fromEntries(getCourses().map((c) => [c.id, c.title]))}
        email={user.user?.email ?? null}
        displayName={profile?.display_name ?? null}
        welcome={welcome === "1"}
        next={safeNextPath(typeof next === "string" ? next : null)}
      />
    </main>
  );
}
