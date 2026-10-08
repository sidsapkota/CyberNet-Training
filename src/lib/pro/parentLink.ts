import "server-only";
/**
 * "Send to a parent" on the server: a learner makes a one-time link; a parent opens it on their own
 * device (no sign-in) and pays for the learner's Founding Member seat on Stripe's page.
 *
 * The link's secret is what authorises the parent, so it's handled like a password: 24 random
 * bytes, only its sha256 hash is stored (founder_parent_links, server-only), it works for 7 days and
 * pays once. The purchase is tied to the learner (client_reference_id), so the webhook claims the
 * seat for them exactly as for their own purchase. Only this module, the /pay page and its route use
 * it (vetted in server-actions.test.ts).
 */
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { claimFounderSeat, getEntitlement, holdFounderSeat } from "./server";
import { FOUNDER_METADATA, founderPurchaseOf, PARENT_LINK_DAYS, PARENT_LINKS_PER_DAY, type ParentLinkState, parentLinkState } from "./founder";
import { founderPriceId, getStripe } from "./stripe";

const DAY = 24 * 60 * 60 * 1000;
const CHECKOUT_MS = 31 * 60 * 1000;

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
const TOKEN = /^[A-Za-z0-9_-]{32}$/;

export type NewParentLink = { token: string } | { error: "limit" };

/** A new link for this learner (the caller checked who they are and that they can buy). */
export async function createParentLink(userId: string, now = new Date()): Promise<NewParentLink> {
  const admin = createSupabaseAdminClient();
  const { count, error: countError } = await admin
    .from("founder_parent_links")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(now.getTime() - DAY).toISOString());
  if (countError) throw new Error(`Couldn't count parent links: ${countError.message}`);
  if ((count ?? 0) >= PARENT_LINKS_PER_DAY) return { error: "limit" };
  const token = randomBytes(24).toString("base64url");
  const { error } = await admin.from("founder_parent_links").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(now.getTime() + PARENT_LINK_DAYS * DAY).toISOString(),
  });
  if (error) throw new Error(`Couldn't save the parent link: ${error.message}`);
  return { token };
}

export interface ParentLinkView {
  state: ParentLinkState;
  /** The learner's public username (their only public identity), for "Lifetime Pro for …". */
  username: string | null;
  linkId: number | null;
  userId: string | null;
}

/** What a link is for, and whether it can still pay. Unknown or malformed links say "unknown". */
export async function findParentLink(token: string | null | undefined, now = new Date()): Promise<ParentLinkView> {
  const none: ParentLinkView = { state: "unknown", username: null, linkId: null, userId: null };
  if (!token || !TOKEN.test(token)) return none;
  const admin = createSupabaseAdminClient();
  const { data: link, error } = await admin
    .from("founder_parent_links")
    .select("id, user_id, expires_at, paid_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) throw new Error(`Couldn't read the parent link: ${error.message}`);
  if (!link) return none;
  const [{ data: profile }, entitlement] = await Promise.all([
    admin.from("profiles").select("username").eq("id", link.user_id).maybeSingle(),
    getEntitlement({ id: link.user_id, createdAt: null }, now),
  ]);
  const state = parentLinkState({ expiresAt: link.expires_at, paidAt: link.paid_at }, { hasProNow: entitlement.hasPro }, founderPriceId() !== null, now);
  return { state, username: profile?.username ?? null, linkId: link.id, userId: link.user_id };
}

/**
 * After the parent pays (the thank-you page): checks the session with Stripe (paid, our founding
 * offer, bought through a parent link) and claims the seat for the learner (idempotent; the webhook
 * does the same). The learner's username for the thank-you, or null if it can't be confirmed.
 */
export async function completeParentPurchase(sessionId: string): Promise<{ username: string | null } | null> {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.status !== "complete" || !session.metadata?.parent_link) return null;
  const purchase = founderPurchaseOf(session as unknown as Record<string, unknown>);
  if (!purchase) return null;
  await claimFounderSeat(purchase);
  const { data } = await createSupabaseAdminClient().from("profiles").select("username").eq("id", purchase.userId).maybeSingle();
  return { username: data?.username ?? null };
}

export type ParentCheckout = { url: string } | { error: ParentLinkState | "all_held" | "stripe" };

/**
 * Starts the parent's checkout: payment mode, no account (Stripe asks the parent for an email for
 * the receipt), the seat held and the purchase tied to the learner. Re-checks the link first.
 */
export async function startParentCheckout(token: string, origin: string, now = new Date()): Promise<ParentCheckout> {
  const link = await findParentLink(token, now);
  if (link.state !== "ok" || !link.userId || link.linkId === null) return { error: link.state };
  const price = founderPriceId();
  if (!price) return { error: "off" };
  const expiresAt = new Date(now.getTime() + CHECKOUT_MS);
  const metadata = { ...FOUNDER_METADATA, user_id: link.userId, parent_link: String(link.linkId) };
  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: link.userId,
      line_items: [{ price, quantity: 1 }],
      metadata,
      payment_intent_data: { metadata },
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      success_url: `${origin}/pay/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay?t=${token}`,
    });
  } catch (error) {
    console.error("Parent checkout failed", error);
    return { error: "stripe" };
  }
  if (!(await holdFounderSeat(link.userId, session.id, expiresAt))) {
    await getStripe().checkout.sessions.expire(session.id).catch(() => undefined);
    return { error: "all_held" };
  }
  const { error } = await createSupabaseAdminClient()
    .from("founder_parent_links")
    .update({ checkout_session_id: session.id, opened_at: now.toISOString() })
    .eq("id", link.linkId);
  if (error) console.error("Parent link: couldn't save the checkout", error.message);
  return session.url ? { url: session.url } : { error: "stripe" };
}
