import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/LoginForm";
import { safeNextPath } from "@/lib/auth/redirect";
import { signedInUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  // `?next=` (e.g. /pro from "What's next"): where to land after signing in.
  const nextPath = typeof next === "string" ? safeNextPath(next, "") || undefined : undefined;
  if (await signedInUserId()) redirect(nextPath ?? "/account");
  return (
    <main className="px-gutter py-10 sm:py-14">
      <LoginForm linkError={error === "link"} next={nextPath} />
    </main>
  );
}
