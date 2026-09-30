import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/LoginForm";
import { signedInUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await signedInUserId()) redirect("/account");
  const { error } = await searchParams;
  return (
    <main className="px-gutter py-10 sm:py-14">
      <LoginForm linkError={error === "link"} />
    </main>
  );
}
