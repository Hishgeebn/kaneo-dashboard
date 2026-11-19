"use client";

import { useState } from "react";
import clsx from "clsx";
import { Cell, Pie, PieChart } from "recharts";
import { CHATBOT_COLOR } from "./WeeklyChart";

/** `chatbot`: resolved chatbot requests (its API does not split them by who decided); null hides the slice. */
type Props = { arrived: number; staff: number; ai: number; chatbot: number | null };

export function TodayPie({ arrived, staff, ai, chatbot }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const slices = [
    { label: "Ажилтан", value: staff, color: "#0B63F6" },
    { label: "Azaa AI", value: ai, color: "#8FBAFB" },
    ...(chatbot === null ? [] : [{ label: "Чатбот", value: chatbot, color: CHATBOT_COLOR }]),
    // Requests resolved today may have arrived earlier, so this can't go below 0.
    { label: "Шийдвэрлээгүй", value: Math.max(arrived - staff - ai - (chatbot ?? 0), 0), color: "#DCE3EC" },
  ];
  const isEmpty = slices.every((s) => s.value === 0);
  const dim = (i: number) => hovered !== null && hovered !== i;

  return (
    <div className="mt-0.5 flex items-center gap-4 border-l border-white/20 pl-[22px]" onMouseLeave={() => setHovered(null)}>
      <PieChart width={84} height={84} style={{ filter: "drop-shadow(0 4px 10px rgba(10,30,90,0.25))" }}>
        <Pie
          data={isEmpty ? [{ label: "", value: 1, color: "#DCE3EC" }] : slices}
          dataKey="value"
          nameKey="label"
          outerRadius={39}
          startAngle={90}
          endAngle={-270}
          stroke="#fff"
          strokeWidth={2}
          isAnimationActive={false}
          onMouseEnter={(_, i) => setHovered(i)}
        >
          {(isEmpty ? [{ color: "#DCE3EC" }] : slices).map((s, i) => (
            <Cell key={i} fill={s.color} opacity={dim(i) ? 0.4 : 1} style={{ transition: "opacity .25s" }} />
          ))}
        </Pie>
      </PieChart>

      <ul className={clsx("flex min-w-[136px] flex-col", chatbot === null ? "gap-1.5" : "gap-0.5")}>
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setHovered(i)}
            className="flex cursor-default items-center justify-between gap-3 transition-opacity duration-300"
            style={{ opacity: dim(i) ? 0.45 : 1 }}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-sky-100/90">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color, boxShadow: "0 0 0 1.5px #fff" }} />
              {s.label}
            </span>
            <span className="text-sm font-bold tabular-nums text-white">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
