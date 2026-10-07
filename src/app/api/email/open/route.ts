import { markOpened } from "@/lib/reminders/server";

/** The reminder email's 1×1 open image. Notes the first open (by the email's own random key). */
export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: Request) {
  const url = new URL(request.url);
  await markOpened(url.searchParams.get("r"), url.searchParams.get("k")).catch((error: unknown) => console.error("Reminders: open", error));
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "private, no-store" } });
}
