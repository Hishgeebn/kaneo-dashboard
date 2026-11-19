#!/usr/bin/env node
// Points a Kaneo project's outgoing webhook at this dashboard (see README «Realtime»).
//
//   node scripts/register-kaneo-webhook.mjs <projectId>...            dry run: prints the plan, calls nothing
//   node scripts/register-kaneo-webhook.mjs <projectId>... --apply    reads each project's webhook, then sets it
//   ... --apply --replace                                              also overwrites a webhook that is already set
//
// Env: KANEO_API_URL, KANEO_API_TOKEN (workspace:manage_settings), KANEO_WEBHOOK_SECRET,
//      DASHBOARD_URL (public base URL; Kaneo refuses localhost / private addresses).
//
// Kaneo keeps ONE webhook per project and "create" replaces it. Without --replace, a project whose
// webhook already points somewhere (e.g. chatbot-prod → the chatbot backend) is left alone.

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const replace = args.includes("--replace");
const projectIds = args.filter((a) => !a.startsWith("--"));

const api = (process.env.KANEO_API_URL || "https://api.kaneo.ufe.edu.mn/api").replace(/\/+$/, "");
const token = process.env.KANEO_API_TOKEN || "";
const secret = process.env.KANEO_WEBHOOK_SECRET || "";
const dashboard = (process.env.DASHBOARD_URL || "").replace(/\/+$/, "");

const fail = (message) => {
  console.error(message);
  process.exit(1);
};
if (projectIds.length === 0) fail("Usage: register-kaneo-webhook.mjs <projectId>... [--apply [--replace]]");
if (!/^https?:\/\//.test(dashboard)) fail("Set DASHBOARD_URL, e.g. https://dashboard.example.mn");
if (secret.length < 16) fail("Set KANEO_WEBHOOK_SECRET (16+ characters, the same value the dashboard uses)");
if (apply && !token) fail("Set KANEO_API_TOKEN to apply");

const body = {
  webhookUrl: `${dashboard}/api/kaneo/webhook`,
  secret,
  // Everything that changes a number on the dashboard.
  events: {
    taskCreated: true,
    taskStatusChanged: true,
    taskMoved: true,
    taskDueDateChanged: true,
    taskDescriptionChanged: true,
    taskDeleted: true,
  },
};
const shown = { ...body, secret: `${secret.slice(0, 2)}…(${secret.length})` };

async function call(method, projectId, payload) {
  const response = await fetch(`${api}/generic-webhook-integration/project/${encodeURIComponent(projectId)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${projectId}: HTTP ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

for (const projectId of projectIds) {
  if (!apply) {
    console.log(`[dry run] POST ${api}/generic-webhook-integration/project/${projectId}`, JSON.stringify(shown));
    continue;
  }
  const current = await call("GET", projectId);
  if (current?.webhookConfigured && !replace) {
    console.log(`${projectId}: already sends to ${current.maskedWebhookUrl}; left alone (pass --replace to overwrite).`);
    continue;
  }
  const saved = await call("POST", projectId, body);
  console.log(`${projectId}: now sends to ${saved?.maskedWebhookUrl}, signed: ${saved?.secretConfigured}`);
}
if (!apply) console.log("Dry run only. Add --apply to call Kaneo.");
