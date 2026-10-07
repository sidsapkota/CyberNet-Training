import "server-only";
/**
 * The admin gate (docs/plans/admin.md). Every admin page, data function and route calls
 * `requireAdmin()` first. The user comes only from the verified session (`auth.getUser()`); the
 * allowlist only from the server env var ADMIN_USER_IDS (Supabase user ids, never emails); and the
 * sign-in must be under 12 hours old. Anyone else gets the site's ordinary 404, so nothing says
 * /admin exists.
 */
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, parseAdminIds } from "./rules";

export interface Admin {
  id: string;
}

/** The admin, or null (no session, not on the allowlist, or signed in too long ago). */
export async function adminOrNull(now = new Date()): Promise<Admin | null> {
  const allowlist = parseAdminIds(process.env.ADMIN_USER_IDS);
  if (allowlist.size === 0) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return isAdmin(data.user.id, data.user.last_sign_in_at, allowlist, now) ? { id: data.user.id } : null;
  } catch {
    return null; // no Supabase settings: no accounts, no admin
  }
}

/** The admin, or the ordinary 404 page for everyone else. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await adminOrNull();
  if (!admin) notFound();
  return admin;
}
