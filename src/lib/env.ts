import "server-only";
import { z } from "zod";

/** Server-side settings, validated once at startup. See .env.example. */
const schema = z.object({
  KANEO_API_URL: z.url().default("https://api.kaneo.ufe.edu.mn/api"),
  KANEO_API_TOKEN: z.string().min(1, "KANEO_API_TOKEN is required"),
  KANEO_WORKSPACE_ID: z.string().min(1, "KANEO_WORKSPACE_ID is required"),
  KANEO_EXCLUDE_PROJECTS: z.string().default("staging,test"),
  KANEO_REVALIDATE_SECONDS: z.coerce.number().int().positive().default(60),
  KANEO_AI_USER_IDS: z.string().default(""),
  KANEO_TEST_MARKERS: z.string().default("b24fm1195,pentest,tes test"),
  /** Projects whose cards are the chatbot's requests (counted from CHATBOT_API_URL when it works). */
  KANEO_CHATBOT_PROJECTS: z.string().default("chatbot"),
  /** Signs Kaneo's webhook deliveries; unset = every delivery is refused. */
  KANEO_WEBHOOK_SECRET: z.string().default(""),
  // Chatbot backend; both unset = the dashboard shows Kaneo only.
  CHATBOT_API_URL: z.union([z.literal(""), z.url()]).default(""),
  CHATBOT_DASHBOARD_TOKEN: z.string().default(""),
});

const list = (s: string) =>
  s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,
  /** Kaneo user ids whose resolutions count as "Azaa AI". */
  aiUserIds: new Set(list(parsed.KANEO_AI_USER_IDS)),
  /** Substrings (title/description) that mark test submissions. */
  testMarkers: list(parsed.KANEO_TEST_MARKERS),
  /** Projects whose name contains one of these are skipped (staging, test boards…). */
  excludeProjects: list(parsed.KANEO_EXCLUDE_PROJECTS),
  /** Projects holding the chatbot's cards. */
  chatbotProjects: list(parsed.KANEO_CHATBOT_PROJECTS),
};
