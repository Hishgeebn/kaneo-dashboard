import { connection } from "next/server";
import { subscribe } from "@/lib/live";

const HEARTBEAT_MS = 25_000; // keeps proxies from closing an idle stream

/** Server-sent events: `change` whenever the Kaneo webhook fires (see LiveStatus). */
export async function GET(request: Request) {
  await connection(); // never prerender: this stream stays open
  const encoder = new TextEncoder();
  let close = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const unsubscribe = subscribe(send);
      const heartbeat = setInterval(() => {
        try {
          send(": ping\n\n");
        } catch {
          close();
        }
      }, HEARTBEAT_MS);
      close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {} // already closed
      };
      request.signal.addEventListener("abort", close);
      send("retry: 5000\nevent: ready\ndata: {}\n\n");
    },
    cancel: () => close(),
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx: do not buffer the stream
    },
  });
}
