"use server";

import { updateTag } from "next/cache";
import { CHATBOT_CACHE_TAG } from "@/lib/chatbot/client";
import { getStudentRequests, KANEO_CACHE_TAG } from "@/lib/kaneo/requests";
import { POLL_SECONDS } from "@/lib/timing";

/** Drops the cached Kaneo and chatbot data so the page reloads them right now. */
export async function refreshKaneoData() {
  updateTag(KANEO_CACHE_TAG);
  updateTag(CHATBOT_CACHE_TAG);
}

/**
 * The timed reload from open dashboards. Fetches from Kaneo again only when the cached data is
 * older than POLL_SECONDS, so many open screens still cost one Kaneo load per interval.
 * Returns true when it dropped the cache (the page then re-renders with the fresh data).
 */
export async function refreshIfOlderThan(): Promise<boolean> {
  const { fetchedAt } = await getStudentRequests();
  // A few seconds of slack, so a screen whose timer fires just early still reloads.
  if (Date.now() - fetchedAt.getTime() < (POLL_SECONDS - 10) * 1000) return false;
  updateTag(KANEO_CACHE_TAG);
  updateTag(CHATBOT_CACHE_TAG);
  return true;
}
