import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { getActivities, getAllTasks, getProjects, type KaneoActivity, type KaneoTask } from "./client";

/** A student request, simplified from a Kaneo task. */
export type StudentRequest = {
  /** Kaneo project name. */
  project: string;
  number: number | null;
  type: string;
  outcome: "resolved" | "rejected" | "open";
  rejectReasons: string[];
  createdAt: Date;
  closedAt: Date | null;
  /** False when the task arrived in Kaneo already closed, so its processing time is unknown. */
  durationKnown: boolean;
  dueAt: Date | null;
  closedBy: "staff" | "ai" | null;
};

/** Red labels are rejection reasons ("Баримт дутуу", …). */
const REJECT_LABEL_COLOR = "red";

// `eventData` is untyped in the API spec; this is its shape for status changes.
const statusChange = z.object({ newStatus: z.string() });

/**
 * The request type line the request form writes into the description:
 * "**Хүсэлтийн төрөл:** …" (old form) or "**Хүсэлт:** …" (СЭЗИС app).
 */
function requestType(task: KaneoTask): string | null {
  const match = /\*\*(?:Хүсэлтийн төрөл|Хүсэлт):\*\*\s*(.+)/.exec(task.description ?? "");
  return match ? match[1].trim() : null;
}

function isTestSubmission(task: KaneoTask): boolean {
  const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
  return env.testMarkers.some((marker) => text.includes(marker));
}

/** The last time the task was moved to done/rejected. */
function lastClose(activity: KaneoActivity[]) {
  return activity
    .filter((a) => a.type === "status_changed")
    .map((a) => ({ ...a, change: statusChange.safeParse(a.eventData).data }))
    .filter((a) => a.change?.newStatus === "done" || a.change?.newStatus === "rejected")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1);
}

function toStudentRequest(project: string, task: KaneoTask, activity: KaneoActivity[]): StudentRequest {
  const outcome = task.status === "done" ? "resolved" : task.status === "rejected" ? "rejected" : "open";
  const statusClose = outcome === "open" ? undefined : lastClose(activity);
  // Some integrations (e.g. the СЭЗИС app) create tasks directly in a final column, with no
  // status change logged. Then the "created" entry is the best close time we have.
  const close = statusClose ?? (outcome === "open" ? undefined : activity.find((a) => a.type === "created"));

  return {
    project,
    number: task.number,
    type: requestType(task) ?? "Тодорхойгүй",
    outcome,
    rejectReasons: task.labels.filter((l) => l.color === REJECT_LABEL_COLOR).map((l) => l.name),
    createdAt: new Date(task.createdAt),
    closedAt: close ? new Date(close.createdAt) : outcome === "open" ? null : new Date(task.createdAt),
    durationKnown: statusClose !== undefined,
    dueAt: task.dueDate ? new Date(task.dueDate) : null,
    closedBy: close ? (close.userId && env.aiUserIds.has(close.userId.toLowerCase()) ? "ai" : "staff") : null,
  };
}

/** Tag on the cached Kaneo data; `updateTag(KANEO_CACHE_TAG)` forces a fresh load. */
export const KANEO_CACHE_TAG = "kaneo";

/**
 * All real student requests from every (non-excluded) project in the Kaneo workspace,
 * plus when they were fetched and how many came from each project.
 * Cached on the server for KANEO_REVALIDATE_SECONDS, so Kaneo is called at most that often.
 */
export async function getStudentRequests() {
  "use cache";
  cacheLife({ stale: 30, revalidate: env.KANEO_REVALIDATE_SECONDS, expire: 24 * 3600 });
  cacheTag(KANEO_CACHE_TAG);

  const projects = (await getProjects(env.KANEO_WORKSPACE_ID)).filter(
    (p) => !env.excludeProjects.some((word) => p.name.toLowerCase().includes(word)),
  );
  const perProject = await Promise.all(
    projects.map(async (p) => ({
      name: p.name,
      tasks: (await getAllTasks(p.id)).filter(
        (t) =>
          t.status !== "archived" &&
          requestType(t) !== null && // tasks without a request type are internal work, not student requests
          !isTestSubmission(t),
      ),
    })),
  );
  const tasks = perProject.flatMap((p) => p.tasks.map((task) => ({ project: p.name, task })));
  const activities = await getActivities(tasks.map((t) => t.task.id));

  return {
    requests: tasks.map(({ project, task }, i) => toStudentRequest(project, task, activities[i])),
    fetchedAt: new Date(),
    sources: perProject.map((p) => ({ name: p.name, count: p.tasks.length })),
  };
}
