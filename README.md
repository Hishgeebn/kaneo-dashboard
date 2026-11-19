# Сургалтын албаны хүсэлтийн тойм

Next.js dashboard for student requests, with live data from every project in a Kaneo workspace
(`KANEO_WORKSPACE_ID`; projects named like `KANEO_EXCLUDE_PROJECTS`, default `staging,test`, are skipped).

## Run

```bash
nvm use                       # Node 22 (see .nvmrc)
npm install
cp .env.example .env.local    # then set KANEO_API_TOKEN
npm run dev                   # http://localhost:3000
```

Production: `npm run build && npm start`.

## Code map

```
src/
  lib/
    env.ts               settings from .env.local, validated with zod
    kaneo/
      schema.d.ts        Kaneo API types — GENERATED, run `npm run kaneo:types`
      client.ts          typed Kaneo API calls (openapi-fetch)
      requests.ts        Kaneo task → StudentRequest; cached with "use cache"
      signature.ts       checks Kaneo's webhook signature
    chatbot/
      schema.ts          the chatbot API's response, validated with zod
      client.ts          GET from the chatbot backend; cached with "use cache"
    live.ts              open SSE streams (one process, in memory)
    dashboard.ts         all dashboard numbers (date-fns, Ulaanbaatar time)
  components/            one file per widget; charts use Recharts
  app/page.tsx           reads ?period=7d|1m|6m&source=all|app|chatbot and renders the widgets
  app/api/kaneo/webhook  Kaneo → drop caches → tell open pages
  app/api/events         server-sent events for open pages
scripts/register-kaneo-webhook.mjs   point a Kaneo project's webhook here (dry run by default)
tests/                   `npm test`: chatbot schema + webhook signature, no network
```

Data flows one way: **Kaneo API → `client.ts` → `requests.ts` → `dashboard.ts` → components**, and
**chatbot API → `chatbot/client.ts` → `dashboard.ts`**.
Everything in `lib/` runs on the server only (`server-only`), so the token never reaches the browser.

## Packages

| Package | Used for |
|---|---|
| `openapi-fetch` + `openapi-typescript` | Kaneo API calls typed from Kaneo's own OpenAPI spec |
| `zod` | validating env vars and Kaneo's untyped `eventData` |
| `date-fns` + `@date-fns/tz` | date math in Ulaanbaatar time |
| `p-limit` | at most 8 parallel Kaneo requests |
| `recharts` | weekly bar chart and today's pie |
| `clsx` | conditional class names |

If Kaneo's API changes, run `npm run kaneo:types`; TypeScript will then point at any code that needs updating.

## Where each number comes from

The **Бүгд / Апп (REQ) / Чатбот** switch (`?source=`) picks whose requests are counted:

- **Апп (REQ)** — Kaneo cards, except projects named like `KANEO_CHATBOT_PROJECTS` (default `chatbot`).
- **Чатбот** — the chatbot backend's `GET {CHATBOT_API_URL}/api/v1/requests/dashboard/service?period=…`
  (server-side, `Authorization: Bearer CHATBOT_DASHBOARD_TOKEN`). No student names, codes or texts
  come back, only counts and request ids.
- **Бүгд** — both added up.

If the chatbot API is not configured, or the call fails or its answer does not match the schema,
the chatbot's own Kaneo cards are used instead (Бүгд then equals the old all-projects view), and on
failure the header says «Чатботын өгөгдөл авахад алдаа гарлаа» (or «Чатботын өгөгдөл
тохируулаагүй/эрхгүй» when the backend answers 404 — no service token set there — or 401 — wrong
token). The page never fails because of it.

Chatbot API semantics to know: «Шийдвэрлэсэн» is requests that reached DONE only (APPROVED /
APPLYING still count as open); a request can have several rejection reasons, so the reason counts
may add up to more than «Татгалзсан»; the backend does not drop test submissions
(`KANEO_TEST_MARKERS` applies to Kaneo cards only).

| Widget | Kaneo source | Chatbot API source |
|---|---|---|
| Ирсэн / Шийдвэрлэсэн / Татгалзсан | task `status` (`done`, `rejected`, others = open) | `totals.arrived / resolved / rejected` (rejected = staff rejections + rule refusals) |
| Хамгийн их ирсэн хүсэлтүүд | the `**Хүсэлт:**` (or older `**Хүсэлтийн төрөл:**`) line in the description | `by_type[].arrived`, shown as `№number title` so it adds up with Kaneo's |
| Татгалзсан шалтгаанууд | red labels on the task | `rejection_reasons[]` counts, zero rows hidden (failed rule → «Төлбөрийн өртэй», …; a person → «Ажилтан татгалзсан») |
| Хугацаа хэтэрсэн | `dueDate` passed while open, or closed after it | `totals.overdue_open + closed_late`; the card also lists `overdue.by_office` and each open late request, most days late first (type, office, due date, days late, request id) |
| Дундаж хугацаа | created → last `status_changed` to done/rejected | `decision_time.avg_hours`, weighted by `decision_time.count` |
| Weekly chart / Өдрийн гүйцэтгэл | close date of `done` tasks; arrivals by `createdAt` | `daily[]`, as a separate «Чатбот» bar (the API does not say per day who decided); the calendar reads the 6-month answer so the whole month is filled |
| Azaa AI share | `KANEO_AI_USER_IDS` (below) | `decided_by.auto` vs `decided_by.person`, under the weekly chart |

Overdue differs slightly by source: a Kaneo card counts if it arrived in the period; a chatbot
request counts if it is late now, or closed late within the period.

Excluded: archived tasks, tasks with no request-type line (internal work), and test
submissions matching `KANEO_TEST_MARKERS`.

**Azaa AI:** Kaneo has no field for it. Put the Kaneo user id(s) the AI closes requests with in
`KANEO_AI_USER_IDS`; until then every resolution counts as "Ажилтан".

Kaneo data is cached for `KANEO_REVALIDATE_SECONDS` (default 60 s), chatbot data for 30 s. The header
shows when each was last loaded and from which projects; the **Шинэчлэх** button reloads both right away.

## Realtime («Шууд»)

1. Kaneo sends a card change to `POST /api/kaneo/webhook`. The route checks
   `X-Kaneo-Signature = hex(HMAC-SHA256(KANEO_WEBHOOK_SECRET, raw body))` (Kaneo's generic-webhook
   scheme, the same check the chatbot backend does); unsigned or wrong → 401, unset secret → every
   delivery refused.
2. It expires the `kaneo` and `chatbot` caches and sends `event: change` to every open page over
   `GET /api/events` (server-sent events, a `: ping` every 25 s).
3. Each page (`LiveStatus`, the «Шууд» dot) reloads its data 2 s after the last change. While the
   stream is down the dot says «Шууд биш» and the page reloads every 60 s instead.

**Limitation:** the open streams are kept in memory in one Node process (`src/lib/live.ts`). Run a
single `next start` instance; with several instances or serverless, a webhook reaches only the pages
connected to the instance that received it (the others catch up when their cache expires). A shared
pub/sub (e.g. Redis) would lift this. A proxy in front must not buffer `text/event-stream`.

### Pointing Kaneo at the dashboard

Kaneo has **one** outgoing webhook per project, and setting it replaces the old one. So:

- **REQ** — if nothing else uses its webhook, register the dashboard:
  ```bash
  export DASHBOARD_URL=https://<dashboard host> KANEO_WEBHOOK_SECRET=<secret>
  node scripts/register-kaneo-webhook.mjs <REQ project id>            # dry run: prints the plan
  KANEO_API_TOKEN=<token> node scripts/register-kaneo-webhook.mjs <REQ project id> --apply
  ```
  With `--apply` the script first reads the project's webhook and leaves it alone if one is already
  set (add `--replace` only when you mean to overwrite it).
- **chatbot-prod** already sends its webhook to the chatbot backend, which needs it. Do not replace
  it; have the backend pass each verified delivery on to `POST /api/kaneo/webhook` with the same body
  and `X-Kaneo-Signature` (same secret on both). Until then, an open page shows chatbot changes
  with the next REQ change, on «Шинэчлэх», or on reload.

Kaneo only delivers to public URLs, so a local `npm run dev` cannot be registered; test it with a
signed `curl` (`tests/contract.test.mjs` shows the signing).
