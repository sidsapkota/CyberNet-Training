import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "email", "signup", "invite", "recovery", "email_change"];

/**
 * Finishes sign-in:
 * - `?code=…`: Google OAuth and the default magic-link email (PKCE, same browser).
 * - `?token_hash=…&type=…`: magic links whose email template links here directly.
 * New accounts without a display name go to /account to pick one.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(url.searchParams.get("next"));
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const supabase = await createSupabaseServerClient();
  let error: unknown = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    error = new Error("Missing sign-in code");
  }
  if (error) return to("/login?error=link");

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
    if (!profile?.display_name) return to("/account?welcome=1");
  }
  return to(next);
}
