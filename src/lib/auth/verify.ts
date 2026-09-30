/**
 * The one way server code learns who the user is: `auth.getUser()`, which asks the Supabase Auth
 * server to validate the session. Never `getSession()` (it trusts the cookie without checking
 * it), and never a user id sent by the client.
 */

export class NotSignedInError extends Error {
  constructor() {
    super("You need to be signed in to do that.");
    this.name = "NotSignedInError";
  }
}

/** Anything with Supabase's `auth.getUser()`; lets tests pass a fake client. */
export interface VerifiableAuthClient {
  auth: {
    getUser(): Promise<{ data: { user: { id: string; created_at?: string } | null }; error: unknown }>;
  };
}

export async function verifiedUserId(client: VerifiableAuthClient): Promise<string> {
  return (await verifiedUser(client)).id;
}

/** The verified user's id and when their account was created (for the early-user grant). */
export async function verifiedUser(client: VerifiableAuthClient): Promise<{ id: string; createdAt: string | null }> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) throw new NotSignedInError();
  return { id: data.user.id, createdAt: data.user.created_at ?? null };
}
