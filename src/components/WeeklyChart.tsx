"use client";

import { useState } from "react";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import type { Dashboard } from "@/lib/dashboard";
import { Card } from "./Card";

type Props = { weekly: Dashboard["weekly"]; range: Dashboard["range"]; decidedBy: Dashboard["decidedBy"] };

const STAFF = "#0B63F6";
const AI = "#8FBAFB";
/** Chatbot resolutions; its API counts who decided only for the whole period (`decidedBy`). */
export const CHATBOT_COLOR = "#2BB3A3";

export function WeeklyChart({ weekly, range, decidedBy }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const data = weekly.map((w) => ({ ...w, total: w.ajiltan + w.azaaAi + w.chatbot }));
  const decided = decidedBy ? decidedBy.auto + decidedBy.person : 0;
  const total = data.reduce((sum, w) => sum + w.total, 0);
  const dim = (i: number) => hovered !== null && hovered !== i;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <h2 className="text-base font-semibold text-slate-800">Шийдвэрлэсэн хүсэлт</h2>
        <div className="flex items-center gap-4">
          <Legend color={STAFF} label="Ажилтан" />
          <Legend color={AI} label="Azaa AI" />
          {decidedBy && <Legend color={CHATBOT_COLOR} label="Чатбот" />}
        </div>
      </div>

      {/* Week labels + totals above each bar */}
      <div className="mt-3 grid pl-10" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((w, i) => (
          <div
            key={w.week}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={clsx("min-w-0 cursor-default border-l border-slate-100 pb-2 pl-3 transition-colors first:border-l-0", dim(i) ? "text-slate-300" : "text-slate-800")}
          >
            <p className={clsx("truncate text-xs font-medium", !dim(i) && "text-slate-500")}>{w.week}</p>
            <p className="text-[21px] font-bold leading-tight">{w.total}</p>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <BarChart
          responsive
          style={{ width: "100%", height: "100%" }}
          data={data}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={7}
          onMouseMove={(state) => setHovered(state.isTooltipActive ? Number(state.activeTooltipIndex) : null)}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="staffGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D86F8" />
              <stop offset="100%" stopColor={STAFF} />
            </linearGradient>
            <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A8CBFC" />
              <stop offset="100%" stopColor={AI} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(100,116,139,0.08)" />
          <XAxis dataKey="week" hide />
          <YAxis width={40} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <Tooltip cursor={{ fill: "rgba(11,99,246,0.07)" }} content={<WeekTooltip />} isAnimationActive={false} />
          <Bar dataKey="ajiltan" stackId="resolved" isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill="url(#staffGradient)" opacity={dim(i) ? 0.25 : 1} />)}
          </Bar>
          <Bar dataKey="azaaAi" stackId="resolved" isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill="url(#aiGradient)" opacity={dim(i) ? 0.25 : 1} />)}
          </Bar>
          <Bar dataKey="chatbot" stackId="resolved" isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={CHATBOT_COLOR} opacity={dim(i) ? 0.25 : 1} />)}
          </Bar>
        </BarChart>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Нийт <span className="font-bold text-slate-700">{total}</span> хүсэлт
        <span className="mx-1.5">•</span>
        {range.from} – {range.to}
        {decidedBy && (
          <>
            <span className="mx-1.5">•</span>
            Чатботын шийдвэр: Azaa AI <span className="font-bold text-slate-700">{decidedBy.auto}</span>
            {decided > 0 && ` (${Math.round((decidedBy.auto / decided) * 100)}%)`}, ажилтан{" "}
            <span className="font-bold text-slate-700">{decidedBy.person}</span>
          </>
        )}
      </p>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

type TooltipProps = { active?: boolean; payload?: { payload: Props["weekly"][number] & { total: number } }[] };

function WeekTooltip({ active, payload }: TooltipProps) {
  const week = payload?.[0]?.payload;
  if (!active || !week) return null;
  return (
    <div className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[0_6px_20px_-4px_rgba(10,62,168,0.3)] ring-1 ring-slate-100">
      <span className="font-bold text-slate-800">{week.total}</span> хүсэлт
      <span className="mx-1 text-slate-300">|</span>Ажилтан: <span className="font-bold" style={{ color: STAFF }}>{week.ajiltan}</span>
      <span className="mx-1 text-slate-300">|</span>Azaa AI: <span className="font-bold" style={{ color: AI }}>{week.azaaAi}</span>
      {week.chatbot > 0 && (
        <><span className="mx-1 text-slate-300">|</span>Чатбот: <span className="font-bold" style={{ color: CHATBOT_COLOR }}>{week.chatbot}</span></>
      )}
    </div>
  );
}
