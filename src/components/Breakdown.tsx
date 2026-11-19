import type { Dashboard, Ranked } from "@/lib/dashboard";
import { Card } from "./Card";

export function Breakdown({ data }: { data: Dashboard }) {
  return (
    <Card>
      <h2 className="mb-2.5 text-base font-semibold text-slate-800">Хүсэлтийн задаргаа</h2>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
        <RankedList title="Хамгийн их ирсэн хүсэлтүүд" total={data.kpi.total} items={data.topTypes} dot="bg-[#0B63F6]" text="text-[#0B63F6]" />
        <RankedList title="Татгалзсан шалтгаанууд" total={data.kpi.rejected} items={data.rejectReasons} dot="bg-red-400" text="text-red-500" />
        <RankedList
          title="Хугацаа хэтэрсэн хүсэлтүүд"
          total={data.kpi.overdue}
          items={data.overdue.types}
          dot="bg-amber-400"
          text="text-amber-500"
          note={
            <p className="pt-1.5 text-xs leading-snug text-slate-500">
              Шийдвэрлэх хугацаа нь өнгөрсөн: одоо нээлттэй <b className="text-amber-600">{data.overdue.open}</b>,
              хугацаа хэтэрч хаагдсан <b className="text-amber-600">{data.overdue.closedLate}</b>.
            </p>
          }
        >
          <ChatbotOverdue overdue={data.overdue} />
        </RankedList>
      </div>
    </Card>
  );
}

type Props = {
  title: string;
  total: number;
  items: Ranked[];
  dot: string;
  text: string;
  /** Under the title. */
  note?: React.ReactNode;
  /** Under the list. */
  children?: React.ReactNode;
};

function RankedList({ title, total, items, dot, text, note, children }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-2xl bg-slate-50/80 p-3.5 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 pb-2 text-[clamp(14px,1.1vw,16px)]">
        <span className="flex min-w-0 items-start gap-2">
          <span className={`mt-[0.45em] size-2 shrink-0 rounded-full ${dot}`} />
          <h3 className="font-semibold leading-tight text-balance text-slate-800">{title}</h3>
        </span>
        <span className={`shrink-0 font-bold leading-tight tabular-nums ${text}`}>{total}</span>
      </div>
      {note}
      <ul className="min-h-0 divide-y divide-slate-200/60 overflow-hidden">
        {items.length === 0 && !note && <li className="py-1.5 text-sm text-slate-400">Мэдээлэл алга</li>}
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 py-1.5 transition-colors hover:bg-white/70">
            <span className="min-w-0 text-sm font-medium leading-tight text-slate-600">{item.label}</span>
            <span className={`shrink-0 text-sm font-bold tabular-nums ${text}`}>{item.value}</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

/** The chatbot's overdue requests by office, then one by one (request id only, no student data). */
function ChatbotOverdue({ overdue }: { overdue: Dashboard["overdue"] }) {
  if (overdue.offices.length === 0 && overdue.late.length === 0) return null;
  return (
    <ul
      tabIndex={0}
      aria-label="Чатботын хугацаа хэтэрсэн хүсэлтүүд"
      className="min-h-0 flex-1 divide-y divide-slate-200/60 overflow-y-auto border-t border-slate-200/70 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      {overdue.offices.map((o) => (
        <li key={`office-${o.office}`} className="flex items-center justify-between gap-3 py-1.5">
          <span className="min-w-0 text-sm font-medium leading-tight text-slate-600">{o.office}</span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-600">
            {o.open_overdue} нээлттэй · {o.closed_late} хоцорсон
          </span>
        </li>
      ))}
      {overdue.late.map((r) => (
        <li key={`late-${r.id}`} className="flex items-center justify-between gap-3 py-1.5">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium leading-tight text-slate-600" title={r.type}>{r.type}</span>
            <span className="block text-xs text-slate-400">#{r.id} · {r.office} · хугацаа {r.due}</span>
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-amber-500">{r.daysLate} хоног</span>
        </li>
      ))}
    </ul>
  );
}
