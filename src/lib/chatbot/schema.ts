import { z } from "zod";

// No "server-only" / "@/" imports here, so `npm test` can load this file with plain Node.

const count = z.number().int().nonnegative();
// Formatted with date-fns, which throws on an unparsable date.
const datetime = z.iso.datetime({ offset: true, local: true });

/** GET {CHATBOT_API_URL}/api/v1/requests/dashboard/service?period=… (see README). */
export const chatbotDashboardSchema = z.object({
  generated_at: datetime,
  period: z.object({ key: z.string(), from: z.string(), to: z.string(), tz: z.string() }),
  totals: z.object({
    arrived: count,
    resolved: count,
    rejected: count,
    cancelled: count,
    open: count,
    overdue_open: count,
    closed_late: count,
  }),
  by_type: z.array(
    z.object({ number: z.string(), title: z.string(), arrived: count, resolved: count, rejected: count, open: count }),
  ),
  rejection_reasons: z.array(z.object({ code: z.string(), label: z.string(), count })),
  overdue: z.object({
    open: z.array(
      z.object({
        request_id: z.number().int(),
        number: z.string(),
        title: z.string(),
        office: z.string(),
        due: datetime,
        days_late: z.number(),
      }),
    ),
    by_office: z.array(z.object({ office: z.string(), open_overdue: count, closed_late: count })),
  }),
  decision_time: z.object({ avg_hours: z.number().nonnegative(), median_hours: z.number().nonnegative(), count }),
  decided_by: z.object({ auto: count, person: count }),
  daily: z.array(
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), arrived: count, resolved: count, rejected: count }),
  ),
  today: z.object({ arrived: count, resolved: count, rejected: count, open: count }),
});

export type ChatbotDashboard = z.infer<typeof chatbotDashboardSchema>;
