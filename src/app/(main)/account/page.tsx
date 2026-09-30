import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account/AccountPanel";
import { signedInUserId } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const userId = await signedInUserId();
  if (!userId) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const [{ data: user }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  const { welcome } = await searchParams;

  return (
    <main className="px-gutter py-8 sm:py-12">
      <AccountPanel
        email={user.user?.email ?? null}
        displayName={profile?.display_name ?? null}
        welcome={welcome === "1"}
      />
    </main>
  );
}
