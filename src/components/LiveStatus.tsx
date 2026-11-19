"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

const DEBOUNCE_MS = 2_000; // one reload for a burst of card changes
const FALLBACK_POLL_MS = 60_000; // while the stream is down

/** Listens to /api/events and reloads the page's data when Kaneo reports a change. */
export function LiveStatus() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dropped = false;
    const refreshSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS);
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
    const poll = setInterval(() => {
      if (events.readyState !== EventSource.OPEN) router.refresh();
    }, FALLBACK_POLL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      events.close();
    };
  }, [router]);

  return (
    <span
      role="status"
      title={live ? "Kaneo-д өөрчлөлт орох бүрт шинэчлэгдэнэ" : "Шууд холболт тасарсан; минут тутам шинэчлэгдэнэ"}
      className="inline-flex items-center gap-1.5 font-semibold text-white"
    >
      <span className={clsx("size-2 rounded-full", live ? "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]" : "bg-slate-400")} />
      {live ? "Шууд" : "Шууд биш"}
    </span>
  );
}
