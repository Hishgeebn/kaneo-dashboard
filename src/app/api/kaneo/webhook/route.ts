import { revalidateTag } from "next/cache";
import { CHATBOT_CACHE_TAG } from "@/lib/chatbot/client";
import { env } from "@/lib/env";
import { KANEO_CACHE_TAG } from "@/lib/kaneo/requests";
import { signatureMatches } from "@/lib/kaneo/signature";
import { broadcast } from "@/lib/live";

/**
 * Kaneo's generic webhook (REQ and chatbot-prod projects) → drop both caches → tell open dashboards.
 * The event's content is not used: any change to a card means "load again".
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 1_000_000) {
    return new Response("too large", { status: 413 });
  }
  const body = await request.text(); // the signature is over these exact bytes
  if (!signatureMatches(env.KANEO_WEBHOOK_SECRET, body, request.headers.get("x-kaneo-signature"))) {
    return new Response("bad signature", { status: 401 });
  }

  // Expire now (not stale-while-revalidate): the refresh that follows must see the change.
  revalidateTag(KANEO_CACHE_TAG, { expire: 0 });
  revalidateTag(CHATBOT_CACHE_TAG, { expire: 0 });
  broadcast("change", { at: new Date().toISOString() });
  return Response.json({ ok: true });
}
