import clsx from "clsx";
import type { OpenRequest } from "@/lib/dashboard";
import { Card } from "./Card";

/** Requests that are not done yet (any Kaneo column except Шийдвэрлэсэн / Татгалзсан). */
export function OpenRequests({ items }: { items: OpenRequest[] }) {
  const overdue = items.filter((r) => r.overdue).length;

  return (
    <Card className="p-5 pb-3">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <h2 className="text-base font-semibold leading-tight text-slate-800">Шийдвэрлээгүй хүсэлт</h2>
        <div className="shrink-0 text-right">
          <p className="text-[28px] font-bold leading-none text-slate-800">{items.length}</p>
          {overdue > 0 && <p className="mt-1 text-xs font-semibold text-amber-500">{overdue} хэтэрсэн</p>}
        </div>
      </div>

      <ul className="-mr-2 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto pr-2">
        {items.length === 0 && <li className="py-3 text-sm text-slate-400">Бүх хүсэлт шийдвэрлэгдсэн 🎉</li>}
        {items.map((r) => (
          <li key={r.key} className="py-2" title={[r.assignee && `Хариуцагч: ${r.assignee}`, `Хүлээсэн: ${r.waiting}`].filter(Boolean).join(" · ")}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-700">
                {r.number !== null && <span className="text-slate-400">#{r.number} </span>}
                {r.type}
              </p>
              <span className={clsx("shrink-0 text-xs font-semibold tabular-nums", r.overdue ? "text-amber-500" : "text-slate-400")}>
                {r.due}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">{r.who}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate rounded-full bg-blue-50 px-2 py-0.5 font-medium text-[#0B63F6]">{r.status}</span>
              <span className={clsx("shrink-0 font-medium", r.overdue ? "text-amber-500" : "text-slate-400")}>{r.dueText}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
