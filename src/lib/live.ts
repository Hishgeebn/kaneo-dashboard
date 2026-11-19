import "server-only";

type Send = (chunk: string) => void;

// shortcut: the open SSE streams live in this one Node process's memory, so a second instance
// (or serverless) would miss webhooks received by another; move to Redis pub/sub or similar if scaled out.
// Kept on globalThis because each route is bundled separately and would otherwise get its own Set.
const g = globalThis as typeof globalThis & { __dashboardLive?: Set<Send> };
const clients = (g.__dashboardLive ??= new Set());

/** Registers a browser's event stream; returns the function that removes it. */
export function subscribe(send: Send): () => void {
  clients.add(send);
  return () => clients.delete(send);
}

/** Tells every open dashboard that the data changed. */
export function broadcast(event: string, data: unknown) {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const send of clients) {
    try {
      send(chunk);
    } catch {
      clients.delete(send); // stream already closed
    }
  }
}
