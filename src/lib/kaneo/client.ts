import "server-only";
import createClient from "openapi-fetch";
import pLimit from "p-limit";
import { env } from "@/lib/env";
import type { components, paths } from "./schema"; // generated: `npm run kaneo:types`

export type KaneoTask = components["schemas"]["BoardTask"];
export type KaneoActivity = components["schemas"]["Activity"];

const kaneo = createClient<paths>({
  baseUrl: env.KANEO_API_URL,
  headers: { Authorization: `Bearer ${env.KANEO_API_TOKEN}` },
  // Caching is done one level up with "use cache" (see requests.ts).
  fetch: (request) => fetch(request, { cache: "no-store" }),
});

/** The workspace's (non-archived) projects. */
export async function getProjects(workspaceId: string) {
  const { data, error } = await kaneo.GET("/project", { params: { query: { workspaceId } } });
  if (error || !data) throw new Error(`Kaneo: failed to load projects: ${error}`);
  return data;
}

/**
 * Every task in a project, across all board columns and pages,
 * plus the board's column names by status id ("to-do" → "Ирсэн").
 */
export async function getAllTasks(projectId: string) {
  const tasks: KaneoTask[] = [];
  const columns: Record<string, string> = {};
  for (let page = 1, totalPages = 1; page <= totalPages; page++) {
    const { data, error } = await kaneo.GET("/task/tasks/{projectId}", {
      // Always pass `limit`: without it Kaneo uses a page size of 50 and pages overlap.
      params: { path: { projectId }, query: { page: String(page), limit: "100" } },
    });
    if (error || !data) throw new Error(`Kaneo: failed to load tasks (page ${page}): ${error}`);

    totalPages = data.pagination.totalPages;
    const board = data.data;
    for (const c of board.columns) columns[c.id] = c.name;
    tasks.push(...board.columns.flatMap((c) => c.tasks), ...board.plannedTasks, ...board.archivedTasks);
  }
  // A task can appear in more than one list; keep one copy of each.
  return { tasks: [...new Map(tasks.map((t) => [t.id, t])).values()], columns };
}

const limit = pLimit(8); // at most 8 parallel requests to Kaneo

/** The activity log (created, status changes, comments…) for each task, in the same order. */
export function getActivities(taskIds: string[]): Promise<KaneoActivity[][]> {
  return Promise.all(
    taskIds.map((taskId) =>
      limit(async () => {
        const { data, error } = await kaneo.GET("/activity/{taskId}", { params: { path: { taskId } } });
        if (error || !data) throw new Error(`Kaneo: failed to load activity for ${taskId}: ${error}`);
        return data;
      }),
    ),
  );
}
