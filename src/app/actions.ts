"use server";

import { updateTag } from "next/cache";
import { CHATBOT_CACHE_TAG } from "@/lib/chatbot/client";
import { KANEO_CACHE_TAG } from "@/lib/kaneo/requests";

/** Drops the cached Kaneo and chatbot data so the page reloads them right now. */
export async function refreshKaneoData() {
  updateTag(KANEO_CACHE_TAG);
  updateTag(CHATBOT_CACHE_TAG);
}
