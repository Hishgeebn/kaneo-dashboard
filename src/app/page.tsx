import { getDashboard, PERIODS, SOURCES, type PeriodKey, type SourceKey } from "@/lib/dashboard";
import { Header } from "@/components/Header";
import { KpiGrid } from "@/components/KpiGrid";
import { WeeklyChart } from "@/components/WeeklyChart";
import { DayCalendar } from "@/components/DayCalendar";
import { Breakdown } from "@/components/Breakdown";

// Left column is 31% wide, the right block (col-span-3) takes the rest.
const ROW = "grid min-h-0 grid-cols-[31fr_23fr_23fr_23fr] gap-1 [&>*]:min-w-0";

export default async function Page({ searchParams }: PageProps<"/">) {
  const { period, source } = await searchParams;
  const data = await getDashboard(isPeriod(period) ? period : "1m", isSource(source) ? source : "all");

  return (
    <main className="relative h-screen min-h-190 min-w-7xl overflow-hidden bg-[linear-gradient(180deg,#1A2C6E_0%,#0E1E52_38%,#0A1740_60%,#24398A_78%,#5C7BC8_92%,#AFC2E9_100%)] font-sans">
      <Background />
      <div className="relative z-10 flex h-full flex-col gap-1 p-3.5">
        <div className="px-7 pb-1.5 pt-2">
          <Header data={data} />
        </div>
        <section className={`flex-1 ${ROW}`}>
          <KpiGrid kpi={data.kpi} />
          <div className="col-span-3">
            <WeeklyChart weekly={data.weekly} range={data.range} decidedBy={data.decidedBy} />
          </div>
        </section>
        <section className={`flex-[1.12] ${ROW}`}>
          <DayCalendar month={data.month} />
          <div className="col-span-3">
            <Breakdown data={data} />
          </div>
        </section>
      </div>
    </main>
  );
}

function isPeriod(value: unknown): value is PeriodKey {
  return typeof value === "string" && value in PERIODS;
}

function isSource(value: unknown): value is SourceKey {
  return typeof value === "string" && value in SOURCES;
}

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="noise absolute inset-0 opacity-[0.17]" />
      <div className="absolute -left-24 -top-24 size-80 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="absolute -right-16 top-8 size-72 rounded-full bg-blue-200/15 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-blue-100/15 blur-3xl" />
    </div>
  );
}
