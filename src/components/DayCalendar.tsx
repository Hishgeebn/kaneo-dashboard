"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Dashboard, DayStat } from "@/lib/dashboard";
import { Card } from "./Card";

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

/** Share of the day's arrivals that were resolved (0–1). */
function resolvedShare(day: DayStat) {
  const done = day.staff + day.ai + day.chatbot;
  if (day.arrived === 0) return done > 0 ? 1 : 0;
  return Math.min(done / day.arrived, 1); // can exceed 1 when older requests are closed
}

export function DayCalendar({ month }: { month: Dashboard["month"] }) {
  const [selected, setSelected] = useState(month.today);
  const [hovered, setHovered] = useState<number | null>(null);

  const dayNumbers = Array.from({ length: month.daysInMonth }, (_, i) => i + 1);
  const rows = Math.ceil((month.firstWeekday + month.daysInMonth) / 7);
  const label = (day: number) => `${month.monthLabel}/${String(day).padStart(2, "0")}`;

  const shown = hovered ?? selected;
  const stats = month.days[shown];
  const percent = stats ? Math.round(resolvedShare(stats) * 100) : 0;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Өдрийн гүйцэтгэл</h2>
        <span className="text-xs font-medium text-slate-400">{month.label}</span>
      </div>

      <div
        className="mt-2 grid min-h-0 flex-1 grid-cols-7 gap-1"
        style={{ gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHovered(null)}
      >
        {WEEKDAYS.map((w) => (
          <span key={w} className="flex items-center justify-center text-xs font-semibold uppercase text-slate-400">{w}</span>
        ))}
        {Array.from({ length: month.firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}
        {dayNumbers.map((day) => (
          <DayCell
            key={day}
            day={day}
            stats={month.days[day]}
            isFuture={day > month.today}
            isSelected={day === selected}
            isHovered={day === hovered}
            ariaLabel={label(day)}
            onHover={() => setHovered(day)}
            onSelect={() => setSelected(day)}
          />
        ))}
      </div>

      <div className="mt-3.5 flex items-center gap-3.5 text-sm font-medium text-slate-500">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-slate-100" />Хүсэлтгүй</span>
        <span className="flex items-center gap-1.5">
          0%
          <span className="h-3 w-16 rounded bg-gradient-to-r from-[#0B63F6]/0 to-[#0B63F6] ring-1 ring-inset ring-[#0B63F6]/30" />
          100%
        </span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded outline-2 outline-offset-1 outline-[#0B63F6]" />Сонгосон</span>
      </div>

      <div className="mt-2 border-t border-slate-100 pt-2.5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {shown === month.today ? "Өнөөдөр" : label(shown)}:{" "}
            {stats ? (
              <><span className="font-bold text-slate-700">{stats.staff + stats.ai + stats.chatbot}/{stats.arrived}</span> шийдвэрлэсэн</>
            ) : (
              "хүсэлт ирээгүй"
            )}
          </span>
          <span className={clsx("font-bold", stats ? "text-emerald-500" : "text-slate-300")}>{stats ? `${percent}%` : "—"}</span>
        </div>
        <div className="mt-1.5 h-3 rounded-full bg-slate-100 p-[2px]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{
              width: `${percent}%`,
              backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.4) 0 2px, transparent 2px 5px)",
            }}
          />
        </div>
      </div>
    </Card>
  );
}

type DayCellProps = {
  day: number;
  stats: DayStat | undefined;
  isFuture: boolean;
  isSelected: boolean;
  isHovered: boolean;
  ariaLabel: string;
  onHover: () => void;
  onSelect: () => void;
};

function DayCell({ day, stats, isFuture, isSelected, isHovered, ariaLabel, onHover, onSelect }: DayCellProps) {
  const share = stats ? resolvedShare(stats) : 0;
  return (
    <button
      type="button"
      disabled={isFuture}
      aria-pressed={isSelected}
      aria-label={stats ? `${ariaLabel}: ${stats.staff + stats.ai + stats.chatbot}/${stats.arrived} шийдвэрлэсэн` : `${ariaLabel}: хүсэлт ирээгүй`}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={clsx(
        "flex h-full max-h-9 w-full max-w-12 items-center justify-center self-center justify-self-center rounded-md text-sm transition-colors",
        "outline-2 outline-offset-1",
        isSelected ? "outline-[#0B63F6]" : isHovered ? "outline-[#0B63F6]/35" : "outline-transparent",
        isFuture && "cursor-default bg-slate-100 font-semibold text-slate-300",
        !isFuture && !stats && "cursor-pointer bg-slate-100 font-semibold text-slate-400",
        !isFuture && stats && "cursor-pointer font-bold ring-[1.5px] ring-inset ring-[#0B63F6]/30",
        stats && (share >= 0.75 ? "text-white" : "text-[#0A2F7A]"),
      )}
      style={stats && !isFuture ? { backgroundColor: `rgba(11,99,246,${share})` } : undefined}
    >
      {day}
    </button>
  );
}
