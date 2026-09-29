import { EventEmitter } from "node:events";
import { byName, countTasks, type InboxTag, normalizeBaseUrl, type Task, type TaskCounts } from "./model";

export type PaperlessSettings = { url?: string; token?: string };

export type ConnectionState = "unconfigured" | "connecting" | "connected" | "error";

export type TestResult = { ok: true; username?: string } | { ok: false; error: string };

export const POLL_INTERVAL_MS = 60_000;
const TIMEOUT_MS = 15_000;

type Page<T> = { count: number; next?: string | null; results: T[] };
type RawTag = { id: number; name: string; color?: string; is_inbox_tag?: boolean };

/**
 * Polls the paperless-ngx REST API and keeps the inbox tags with their
 * document counts and the task counts.
 *
 * Events:
 *   "update"  new data arrived (inbox counts or tasks)
 *   "state"   the connection state changed
 */
export class PaperlessService extends EventEmitter<{ update: []; state: [] }> {
  #settings: PaperlessSettings = {};
  #state: ConnectionState = "unconfigured";
  #error: string | undefined;
  #timer: ReturnType<typeof setInterval> | undefined;
  #polling: Promise<void> | undefined;
  #inboxTags: InboxTag[] = [];
  #tasks: TaskCounts | undefined;
  #tasksError: string | undefined;

  get settings(): PaperlessSettings {
    return this.#settings;
  }

  get state(): ConnectionState {
    return this.#state;
  }

  get error(): string | undefined {
    return this.#error;
  }

  get isConnected(): boolean {
    return this.#state === "connected";
  }

  /** Inbox tags with their document counts, sorted by name. */
  inboxTags(): InboxTag[] {
    return this.#inboxTags;
  }

  /** Task counts of the last poll; undefined while unknown. */
  tasks(): TaskCounts | undefined {
    return this.#tasks;
  }

  get tasksError(): string | undefined {
    return this.#tasksError;
  }

  /** Applies new connection settings; restarts polling only when they changed. */
  configure(settings: PaperlessSettings): void {
    const url = settings.url ? normalizeBaseUrl(settings.url) : undefined;
    if (url === this.#settings.url && settings.token === this.#settings.token && (this.#timer || !url)) {
      return;
    }
    this.#settings = { url, token: settings.token };
    this.#stop();
    this.#inboxTags = [];
    this.#tasks = undefined;
    this.#tasksError = undefined;
    this.emit("update");

    if (url && settings.token) {
      this.#setState("connecting");
      this.#timer = setInterval(() => void this.refresh(), POLL_INTERVAL_MS);
      void this.refresh();
    } else {
      this.#setState("unconfigured");
    }
  }

  /** Polls now (unless a poll is already running) and resolves when it is done. */
  refresh(): Promise<void> {
    const { url, token } = this.#settings;
    if (!url || !token) {
      return Promise.resolve();
    }
    this.#polling ??= this.#poll(url, token).finally(() => {
      this.#polling = undefined;
    });
    return this.#polling;
  }

  /** Checks URL and token with a request that needs authentication. */
  async test(url: string, token: string): Promise<TestResult> {
    const base = normalizeBaseUrl(url);
    try {
      const settings = await request<{ user?: { username?: string } }>(base, token, "/api/ui_settings/");
      return { ok: true, username: settings.user?.username };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        // Older paperless versions: any authenticated endpoint will do.
        try {
          await request<Page<RawTag>>(base, token, "/api/tags/?page_size=1");
          return { ok: true };
        } catch (inner) {
          return { ok: false, error: describe(inner, base) };
        }
      }
      return { ok: false, error: describe(err, base) };
    }
  }

  async #poll(url: string, token: string): Promise<void> {
    try {
      const tags = await request<Page<RawTag>>(url, token, "/api/tags/?is_inbox_tag=true&page_size=100");
      const inboxTags: InboxTag[] = [];
      for (const tag of tags.results.filter((t) => t.is_inbox_tag !== false)) {
        const documents = await request<Page<unknown>>(url, token, `/api/documents/?tags__id__all=${tag.id}&page_size=1`);
        inboxTags.push({ id: tag.id, name: tag.name, color: tag.color, count: documents.count });
      }
      this.#inboxTags = inboxTags.sort(byName);
      this.#setState("connected");
    } catch (err) {
      this.#setState("error", describe(err, url));
      this.emit("update");
      return;
    }

    try {
      const tasks = await request<Task[] | Page<Task>>(url, token, "/api/tasks/");
      this.#tasks = countTasks(Array.isArray(tasks) ? tasks : tasks.results);
      this.#tasksError = undefined;
    } catch (err) {
      this.#tasks = undefined;
      this.#tasksError = describe(err, url);
    }
    this.emit("update");
  }

  #stop(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
  }

  #setState(state: ConnectionState, error?: string): void {
    if (state === this.#state && error === this.#error) {
      return;
    }
    this.#state = state;
    this.#error = error;
    this.emit("state");
  }
}

class HttpError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
  }
}

async function request<T>(base: string, token: string, path: string): Promise<T> {
  const response = await fetch(base + path, {
    headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText);
  }
  return (await response.json()) as T;
}

function describe(err: unknown, base: string): string {
  if (err instanceof HttpError) {
    if (err.status === 401 || err.status === 403) {
      return "Token rejected, check the API token";
    }
    return `${base}: ${err.message}`;
  }
  const e = err as Error & { cause?: Error };
  const reason = e.cause?.message || e.message || String(err);
  return `Cannot reach ${base}: ${reason}`;
}

export const paperless = new PaperlessService();
