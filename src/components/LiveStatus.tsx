"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { refreshIfOlderThan } from "@/app/actions";
import { POLL_SECONDS, WEBHOOK_DEBOUNCE_MS } from "@/lib/timing";

/**
 * Keeps the page's data current in two ways:
 * - push: /api/events reports a Kaneo webhook → reload within seconds (needs a public URL and
 *   the webhook registered, see README);
 * - timer: every POLL_SECONDS (src/lib/timing.ts) it asks the server to load Kaneo again, so the page stays fresh
 *   even with no webhook (e.g. local `npm run dev`). Paused while the tab is hidden.
 */
export function LiveStatus() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dropped = false;
    let lastPoll = Date.now();

    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), WEBHOOK_DEBOUNCE_MS);
    };

    const poll = async () => {
      lastPoll = Date.now();
      try {
        // When the action drops the cache, Next re-renders the page itself; otherwise another
        // screen already reloaded recently, so just pick up its (shared) data.
        if (!(await refreshIfOlderThan())) router.refresh();
      } catch {
        // Kaneo or the server is unreachable; the next tick tries again.
      }
    };

    const events = new EventSource("/api/events");
    events.addEventListener("ready", () => {
      setLive(true);
      if (dropped) refreshSoon(); // changes may have been missed while disconnected
      dropped = false;
    });
    events.addEventListener("change", refreshSoon);
    events.addEventListener("error", () => {
      dropped = true;
      setLive(events.readyState === EventSource.OPEN);
    });

    const interval = setInterval(() => {
      if (!document.hidden) poll();
    }, POLL_SECONDS * 1000);
    // Back on a tab that sat hidden past an interval: catch up right away.
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastPoll >= POLL_SECONDS * 1000) poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      events.close();
    };
  }, [router]);

  const every = POLL_SECONDS % 60 === 0 ? `${POLL_SECONDS / 60} минут` : `${POLL_SECONDS} секунд`;
  return (
    <span
      role="status"
      title={
        live
          ? `Kaneo-д өөрчлөлт орох бүрт, мөн ${every} тутам шинэчлэгдэнэ`
          : `Шууд холболт тасарсан; ${every} тутам шинэчлэгдэнэ`
      }
      className="inline-flex items-center gap-1.5 font-semibold text-white"
    >
      <span className={clsx("size-2 rounded-full", live ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]" : "bg-slate-400")} />
      {live ? "Шууд" : "Шууд биш"}
    </span>
  );
}
