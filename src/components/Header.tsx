import Link from "next/link";
import clsx from "clsx";
import { PERIODS, SOURCES, type Dashboard, type PeriodKey, type SourceKey } from "@/lib/dashboard";
import { LiveStatus } from "./LiveStatus";
import { RefreshButton } from "./RefreshButton";
import { TodayPie } from "./TodayPie";

export function Header({ data }: { data: Dashboard }) {
  const { today, loaded } = data;
  const href = (period: PeriodKey, source: SourceKey) => `/?period=${period}&source=${source}`;

  return (
    <header className="flex items-stretch justify-between gap-6">
      <div className="pt-1">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-white">
          Сургалтын албаны хүсэлтийн тойм
        </h1>
        <div className="mt-3.5 flex items-center gap-2">
          <Switch
            label="Хугацаа"
            options={(Object.keys(PERIODS) as PeriodKey[]).map((key) => ({
              key,
              label: PERIODS[key].label,
              href: href(key, data.source),
              current: key === data.period,
            }))}
          />
          <Switch
            label="Хүсэлтийн эх сурвалж"
            options={(Object.keys(SOURCES) as SourceKey[]).map((key) => ({
              key,
              label: SOURCES[key],
              href: href(data.period, key),
              current: key === data.source,
            }))}
          />
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-xs font-medium text-sky-100/80">
          <RefreshButton />
          <LiveStatus />
          <span>
            Kaneo-оос {loaded.fetchedAt}-д шинэчилсэн ·{" "}
            {loaded.projects.map((p) => `${p.name}: ${p.count}`).join(", ") || "төсөл олдсонгүй"}
            {loaded.chatbotAt && ` · Чатбот: ${loaded.chatbotAt}`}
          </span>
        </div>
        {loaded.chatbotProblem && (
          <p role="status" className="mt-1.5 inline-block rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-semibold text-amber-100 ring-1 ring-amber-300/40">
            {loaded.chatbotProblem === "denied"
              ? "Чатботын өгөгдөл тохируулаагүй/эрхгүй"
              : "Чатботын өгөгдөл авахад алдаа гарлаа"}{" "}
            — чатботын хүсэлтийг Kaneo-гийн картаар харуулж байна.
          </p>
        )}
      </div>

      <div className="relative -mb-[30px] flex h-[140px] w-[540px] shrink-0 items-start justify-between gap-6 self-start rounded-3xl border border-white/20 bg-gradient-to-b from-[#3D86F8]/95 to-[#0B63F6]/95 px-7 py-5 shadow-xl shadow-blue-900/20 backdrop-blur-md">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-50">Өнөөдөр</p>
            <p className="text-xs font-medium text-sky-100/80">{today.label}</p>
          </div>
          <div className="mt-3.5 flex items-end gap-10">
            <Stat label="Ирсэн" value={today.arrived} />
            <Stat label="Шийдвэрлэсэн" value={today.staff + today.ai + today.chatbot} />
          </div>
        </div>
        <TodayPie arrived={today.arrived} staff={today.staff} ai={today.ai} chatbot={loaded.chatbotAt ? today.chatbot : null} />
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-medium text-sky-100/90">{label}</p>
      <p className="mt-1 text-[32px] font-bold leading-none text-white">{value}</p>
    </div>
  );
}

type Option = { key: string; label: string; href: string; current: boolean };

function Switch({ label, options }: { label: string; options: Option[] }) {
  return (
    <nav aria-label={label} className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
      {options.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          scroll={false}
          aria-current={o.current ? "page" : undefined}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm transition-colors",
            o.current
              ? "bg-[#0B63F6] font-semibold text-white shadow-sm"
              : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
