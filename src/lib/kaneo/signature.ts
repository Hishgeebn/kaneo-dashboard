import { createHmac, timingSafeEqual } from "node:crypto";

// No "server-only" / "@/" imports here, so `npm test` can load this file with plain Node.

/**
 * Whether a webhook delivery really came from our Kaneo.
 *
 * Kaneo's generic webhook signs the body it sends:
 * `X-Kaneo-Signature: hex(HMAC-SHA256(secret, body))` (apps/api/src/plugins/generic-webhook/client.ts).
 * The check runs over the body exactly as it arrived, before parsing. Same rule as the chatbot
 * backend's `signature_matches`: an unset secret matches nothing.
 */
export function signatureMatches(secret: string, body: string, provided: string | null): boolean {
  if (!secret || !provided) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body, "utf8").digest("hex"));
  const given = Buffer.from(provided.trim().toLowerCase());
  return given.length === expected.length && timingSafeEqual(expected, given);
}
