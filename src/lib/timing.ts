/**
 * Every timer in the dashboard, in one place. Change a number here and restart the server.
 * (No "server-only": the browser-side LiveStatus reads these too.)
 */

/** Open dashboards reload the data at least this often, webhook or not. */
export const POLL_SECONDS = 5 * 60;

/** Kaneo data is reused this long before it is loaded again in the background. */
export const KANEO_REVALIDATE_SECONDS = 60;

/** Chatbot API data is reused this long before it is loaded again in the background. */
export const CHATBOT_REVALIDATE_SECONDS = 30;

/** After a webhook, wait this long for more changes so a burst causes one reload. */
export const WEBHOOK_DEBOUNCE_MS = 2_000;

/** Keep-alive ping on the live event stream, so proxies don't close it while idle. */
export const SSE_HEARTBEAT_MS = 25_000;

/** How long the browser waits before reconnecting a dropped event stream. */
export const SSE_RETRY_MS = 5_000;
