/** Data model of what the plugin reads from paperless-ngx, and the pure logic on it. */

export type InboxTag = {
  id: number;
  name: string;
  color?: string;
  /** Documents carrying this tag. */
  count: number;
};

export type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";

export type Task = {
  id: number;
  status: TaskStatus | string;
  /** Failed tasks can be dismissed in the paperless-ngx UI. */
  acknowledged?: boolean;
  task_file_name?: string | null;
};

export type TaskCounts = { running: number; failed: number };

/** Total inbox count: one selected tag, or the sum of all inbox tags. */
export function inboxCount(tags: InboxTag[], selectedTagId?: number): number {
  if (selectedTagId !== undefined) {
    return tags.find((t) => t.id === selectedTagId)?.count ?? 0;
  }
  return tags.reduce((sum, t) => sum + t.count, 0);
}

/** Running (pending or started) and failed tasks; acknowledged failures are not counted. */
export function countTasks(tasks: Task[]): TaskCounts {
  const counts: TaskCounts = { running: 0, failed: 0 };
  for (const task of tasks) {
    if (task.status === "PENDING" || task.status === "STARTED") {
      counts.running++;
    } else if (task.status === "FAILURE" && !task.acknowledged) {
      counts.failed++;
    }
  }
  return counts;
}

/** Trims whitespace and trailing slashes, adds https:// when no scheme is given. */
export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed === "") {
    return "";
  }
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Document list filtered by the inbox tag(s): a single tag as in the paperless
 * "inbox" view, several tags as "any of these", none at all as the plain list.
 */
export function inboxUrl(baseUrl: string, tagIds: number[]): string {
  const base = normalizeBaseUrl(baseUrl);
  if (tagIds.length === 1) {
    return `${base}/documents?tags__id__all=${tagIds[0]}`;
  }
  if (tagIds.length > 1) {
    return `${base}/documents?tags__id__in=${tagIds.join(",")}`;
  }
  return `${base}/documents`;
}

export function tasksUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/tasks`;
}

/** Tag id from the key settings; "0", "" or undefined mean "all inbox tags". */
export function selectedTagId(value: string | number | undefined): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** Threshold from the key settings, at least 1. */
export function inboxThreshold(value: string | number | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
