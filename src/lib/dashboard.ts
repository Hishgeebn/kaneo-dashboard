import "server-only";
import { tz } from "@date-fns/tz";
import {
  differenceInMinutes,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { connection } from "next/server";
import { getChatbotDashboard } from "@/lib/chatbot/client";
import type { ChatbotDashboard } from "@/lib/chatbot/schema";
import { env } from "@/lib/env";
import { getStudentRequests, type StudentRequest } from "@/lib/kaneo/requests";

/** All dates are grouped by Ulaanbaatar local time. */
const ub = { in: tz("Asia/Ulaanbaatar") };
const WEEK = { ...ub, weekStartsOn: 1 } as const; // weeks start on Monday
const dayKey = (d: Date) => format(d, "yyyy-MM-dd", ub);

export const PERIODS = {
  "7d": { label: "7 хоног", days: 7 },
  "1m": { label: "1 сар", days: 30 },
  "6m": { label: "6 сар", days: 182 },
} as const;
export type PeriodKey = keyof typeof PERIODS;

/** Whose requests are shown: ?source=all|app|chatbot */
export const SOURCES = { all: "Бүгд", app: "Апп (REQ)", chatbot: "Чатбот" } as const;
export type SourceKey = keyof typeof SOURCES;

/** `chatbot` = resolutions from the chatbot API, which does not say per day who decided. */
export type DayStat = { arrived: number; staff: number; ai: number; chatbot: number };
export type Ranked = { label: string; value: number };

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(period: PeriodKey, source: SourceKey) {
  const { requests: kaneo, fetchedAt, sources } = await getStudentRequests();
  const status = source === "app" ? "off" : await getChatbotDashboard(period);
  const bot = typeof status === "object" ? status : null;
  // The calendar shows the whole month, which a 7-day / 30-day period does not cover.
  const month = bot && period !== "6m" ? await getChatbotDashboard("6m") : status;
  await connection(); // the rest depends on the current time, so run it per request
  const now = new Date();

  // While the chatbot API is unset or failing, the chatbot's own Kaneo cards stand in for it.
  const isChatbotCard = (r: StudentRequest) => env.chatbotProjects.some((w) => r.project.toLowerCase().includes(w));
  const shown = kaneo.filter((r) => (isChatbotCard(r) ? source !== "app" && !bot : source !== "chatbot"));

  const from = startOfDay(subDays(now, PERIODS[period].days - 1), ub);
  const requests = shown.filter((r) => !isAfter(from, r.createdAt));
  const resolved = requests.filter((r) => r.outcome === "resolved");
  const rejected = requests.filter((r) => r.outcome === "rejected");
  const overdue = requests.filter((r) => isOverdue(r, now));
  const overdueOpen = overdue.filter((r) => r.outcome === "open").length;

  const days = dailyStats(shown);
  addChatbotDays(days, (typeof month === "object" ? month : bot)?.daily ?? []);
  const weekly = weeklyResolved(resolved, bot?.daily ?? [], from, now);

  return {
    period,
    source,
    /** When the data was last loaded from Kaneo / the chatbot API, and from which projects. */
    loaded: {
      fetchedAt: format(fetchedAt, "HH:mm", ub),
      projects: sources,
      chatbotAt: bot ? format(new Date(bot.generated_at), "HH:mm", ub) : null,
      /** Why the chatbot API was not used, when it should have been. */
      chatbotProblem: status === "error" || status === "denied" ? status : null,
    },
    range: { from: format(from, "yyyy/MM/dd", ub), to: format(now, "yyyy/MM/dd", ub) },
    today: { label: format(now, "MM/dd", ub), ...(days.get(dayKey(now)) ?? emptyDay()) },
    kpi: {
      total: requests.length + (bot?.totals.arrived ?? 0),
      resolved: resolved.length + (bot?.totals.resolved ?? 0),
      rejected: rejected.length + (bot?.totals.rejected ?? 0),
      overdue: overdue.length + (bot ? bot.totals.overdue_open + bot.totals.closed_late : 0),
      avgDuration: averageDuration(requests, bot),
    },
    weekly: period === "6m" ? weekly.slice(-12) : weekly,
    month: monthCalendar(days, now),
    /** Final decisions on chatbot requests: Azaa AI / rules vs a person (null without the API). */
    decidedBy: bot?.decided_by ?? null,
    topTypes: rank([
      ...requests.map((r) => ({ label: r.type, value: 1 })),
      ...(bot?.by_type ?? []).map((t) => ({ label: `№${t.number} ${t.title}`, value: t.arrived })),
    ]),
    // Counts per reason; one request can have several, so they may add up to more than `rejected`.
    rejectReasons: rank([
      ...requests.flatMap((r) => r.rejectReasons.map((label) => ({ label, value: 1 }))),
      ...(bot?.rejection_reasons ?? []).map((r) => ({ label: r.label, value: r.count })),
    ]),
    overdue: {
      open: overdueOpen + (bot?.totals.overdue_open ?? 0),
      closedLate: overdue.length - overdueOpen + (bot?.totals.closed_late ?? 0),
      /** Kaneo cards by type. */
      types: rank(overdue.map((r) => ({ label: r.type, value: 1 }))),
      /** Chatbot requests by the office holding them. */
      offices: bot?.overdue.by_office.filter((o) => o.open_overdue + o.closed_late > 0) ?? [],
      /** Chatbot requests late right now: request id only, never student data. */
      late: (bot?.overdue.open ?? [])
        .toSorted((a, b) => b.days_late - a.days_late) // worst first; the API sorts by due date
        .map((o) => ({
          id: o.request_id,
          type: `№${o.number} ${o.title}`,
          office: o.office,
          due: format(new Date(o.due), "yyyy/MM/dd", ub),
          daysLate: o.days_late,
        })),
    },
  };
}

/** Overdue = still open past its due date, or closed after it. */
function isOverdue(r: StudentRequest, now: Date) {
  return r.dueAt !== null && isAfter(r.closedAt ?? now, r.dueAt);
}

const emptyDay = (): DayStat => ({ arrived: 0, staff: 0, ai: 0, chatbot: 0 });

/** Per day: how many requests arrived, and how many were resolved by staff / AI. */
function dailyStats(requests: StudentRequest[]) {
  const days = new Map<string, DayStat>();
  const day = (d: Date) => {
    const key = dayKey(d);
    if (!days.has(key)) days.set(key, emptyDay());
    return days.get(key)!;
  };
  for (const r of requests) {
    day(r.createdAt).arrived++;
    if (r.outcome === "resolved" && r.closedAt) day(r.closedAt)[r.closedBy === "ai" ? "ai" : "staff"]++;
  }
  return days;
}

/** Adds the chatbot API's per-day rows (already Ulaanbaatar days) to the Kaneo ones. */
function addChatbotDays(days: Map<string, DayStat>, daily: ChatbotDashboard["daily"]) {
  for (const d of daily) {
    if (d.arrived === 0 && d.resolved === 0) continue; // keep "Хүсэлтгүй" days empty
    const stat = days.get(d.date) ?? emptyDay();
    stat.arrived += d.arrived;
    stat.chatbot += d.resolved;
    days.set(d.date, stat);
  }
}

/** Resolved requests per Monday–Sunday week, by the day they were closed. */
function weeklyResolved(resolved: StudentRequest[], botDaily: ChatbotDashboard["daily"], from: Date, now: Date) {
  return eachWeekOfInterval({ start: from, end: now }, WEEK).map((weekStart) => {
    const start = dayKey(weekStart);
    const end = dayKey(endOfWeek(weekStart, WEEK));
    const inWeek = resolved.filter((r) => r.closedAt && dayKey(startOfWeek(r.closedAt, WEEK)) === start);
    return {
      week: `${format(weekStart, "MM/dd", ub)}–${format(endOfWeek(weekStart, WEEK), "MM/dd", ub)}`,
      ajiltan: inWeek.filter((r) => r.closedBy !== "ai").length,
      azaaAi: inWeek.filter((r) => r.closedBy === "ai").length,
      chatbot: botDaily.filter((d) => d.date >= start && d.date <= end).reduce((sum, d) => sum + d.resolved, 0),
    };
  });
}

/** The current month's days for the "Өдрийн гүйцэтгэл" heatmap. */
function monthCalendar(days: Map<string, DayStat>, now: Date) {
  const first = startOfMonth(now, ub);
  const monthDays = eachDayOfInterval({ start: first, end: endOfMonth(now, ub) }, ub);
  return {
    label: format(now, "yyyy/MM", ub),
    monthLabel: format(now, "MM", ub),
    today: Number(format(now, "d", ub)),
    daysInMonth: monthDays.length,
    /** 0 = Monday … 6 = Sunday */
    firstWeekday: Number(format(first, "i", ub)) - 1,
    /** day of month → stats (days without requests are missing) */
    days: Object.fromEntries(
      monthDays.flatMap((d) => {
        const s = days.get(dayKey(d));
        return s ? [[Number(format(d, "d", ub)), s]] : [];
      }),
    ) as Record<number, DayStat>,
  };
}

/** Average time from arrival to resolved/rejected, e.g. "26ц 36мин"; the chatbot's average is weighted by its count. */
function averageDuration(requests: StudentRequest[], bot: ChatbotDashboard | null): string | null {
  const minutes = requests
    .filter((r) => r.closedAt && r.durationKnown)
    .map((r) => differenceInMinutes(r.closedAt!, r.createdAt));
  const botCount = bot?.decision_time.count ?? 0;
  const count = minutes.length + botCount;
  if (count === 0) return null;
  const total = minutes.reduce((a, b) => a + b, 0) + (bot?.decision_time.avg_hours ?? 0) * 60 * botCount;
  const avg = Math.round(total / count);
  return `${Math.floor(avg / 60)}ц ${avg % 60}мин`;
}

/** Top 5 labels by summed value. */
function rank(items: Ranked[], top = 5): Ranked[] {
  const totals = new Map<string, number>();
  for (const { label, value } of items) totals.set(label, (totals.get(label) ?? 0) + value);
  return [...totals]
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}
