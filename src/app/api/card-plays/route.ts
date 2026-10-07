import { CardPlaySchema } from "@/lib/measure/cardPlays";
import { recordCardPlay } from "@/lib/measure/server";

/**
 * One anonymous card measurement from the lesson player (time to the first Check, right first time
 * or not). No account or id needed or stored; checked against the content before it's kept.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (text.length > 1000) return new Response(null, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const play = CardPlaySchema.safeParse(json);
  if (!play.success) return new Response(null, { status: 400 });
  const ok = await recordCardPlay(play.data);
  return new Response(null, { status: ok ? 204 : 422 });
}
