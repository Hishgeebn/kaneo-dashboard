import type { Dashboard } from "@/lib/dashboard";
import { Card } from "./Card";

const icon = (paths: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

export function KpiGrid({ kpi }: { kpi: Dashboard["kpi"] }) {
  const items = [
    {
      label: "Шийдвэрлэсэн / Нийт",
      value: (<>{kpi.resolved} <span className="text-base font-semibold text-slate-400">/ {kpi.total}</span></>),
      color: "bg-blue-50 text-[#0B63F6]",
      icon: icon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></>),
    },
    {
      label: "Татгалзсан",
      value: kpi.rejected,
      color: "bg-red-50 text-red-500",
      icon: icon(<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></>),
    },
    {
      label: "Хугацаа хэтэрсэн",
      value: kpi.overdue,
      color: "bg-amber-50 text-amber-500",
      icon: icon(<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3" /></>),
    },
    {
      label: "Дундаж хугацаа",
      value: <span className="text-[24px]">{kpi.avgDuration ?? "—"}</span>,
      color: "bg-blue-50 text-[#0B63F6]",
      icon: icon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>),
    },
  ];

  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
      {items.map((item) => (
        <Card key={item.label} className="justify-between p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.color}`}>{item.icon}</span>
          </div>
          <p className="text-[28px] font-bold leading-none text-slate-800">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
