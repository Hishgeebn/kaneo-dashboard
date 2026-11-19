// Run with `npm test`. Never calls Kaneo or the chatbot: only the fixture and fixed strings.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { chatbotDashboardSchema } from "../src/lib/chatbot/schema.ts";
import { signatureMatches } from "../src/lib/kaneo/signature.ts";

const fixture = JSON.parse(readFileSync(new URL("./chatbot-dashboard.fixture.json", import.meta.url), "utf8"));

test("the contract's response shape parses", () => {
  const parsed = chatbotDashboardSchema.parse(fixture);
  assert.equal(parsed.totals.overdue_open, 2);
  assert.equal(parsed.overdue.open[0].request_id, 42);
});

test("a changed shape is refused, not shown half-read", () => {
  assert.equal(chatbotDashboardSchema.safeParse({ ...fixture, totals: { arrived: 1 } }).success, false);
  assert.equal(chatbotDashboardSchema.safeParse({ ...fixture, daily: [{ date: "19/11", arrived: 0, resolved: 0, rejected: 0 }] }).success, false);
  assert.equal(chatbotDashboardSchema.safeParse({ ...fixture, decided_by: { auto: -1, person: 0 } }).success, false);
  const late = { ...fixture.overdue.open[0], due: "16/11/2026" };
  assert.equal(chatbotDashboardSchema.safeParse({ ...fixture, overdue: { ...fixture.overdue, open: [late] } }).success, false);
});

// The same signing Kaneo does in apps/api/src/plugins/generic-webhook/client.ts.
const body = JSON.stringify({ event: "task.status_changed", data: { taskId: "t1", title: "Чөлөө" } });
const sign = (secret, text) => createHmac("sha256", secret).update(text).digest("hex");

test("Kaneo's signature is accepted", () => {
  assert.equal(signatureMatches("s3cret", body, sign("s3cret", body)), true);
  assert.equal(signatureMatches("s3cret", body, ` ${sign("s3cret", body).toUpperCase()} `), true);
});

test("unsigned, wrongly signed, altered or unconfigured deliveries are refused", () => {
  assert.equal(signatureMatches("s3cret", body, null), false);
  assert.equal(signatureMatches("s3cret", body, ""), false);
  assert.equal(signatureMatches("s3cret", body, sign("other", body)), false);
  assert.equal(signatureMatches("s3cret", body + " ", sign("s3cret", body)), false);
  assert.equal(signatureMatches("s3cret", body, sign("s3cret", body).slice(0, 10)), false);
  assert.equal(signatureMatches("", body, sign("", body)), false);
});
