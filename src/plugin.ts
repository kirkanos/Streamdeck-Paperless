import streamDeck from "@elgato/streamdeck";
import { InboxAction } from "./actions/inbox";
import { TasksAction } from "./actions/tasks";
import { paperless, type PaperlessSettings } from "./paperless/service";

type JsonValue = Parameters<typeof streamDeck.ui.sendToPropertyInspector>[0];

streamDeck.logger.setLevel("info");

const inbox = new InboxAction();
const tasks = new TasksAction();

streamDeck.actions.registerAction(inbox);
streamDeck.actions.registerAction(tasks);

// Keep every visible key in sync with paperless.

function refreshAll(): void {
  void inbox.refresh();
  void tasks.refresh();
}

paperless.on("update", () => {
  refreshAll();
  // Property inspectors with a hot-reloading tag list pick this up.
  sendToPropertyInspector({ event: "getInboxTags", items: inboxTagItems() });
});

paperless.on("state", () => {
  streamDeck.logger.info(`paperless connection: ${paperless.state}${paperless.error ? ` (${paperless.error})` : ""}`);
  refreshAll();
  sendToPropertyInspector(statusMessage());
});

// Messages from the property inspectors (ui/*.html).

type UiMessage = { event: "getInboxTags" | "getStatus" | "disconnect" } | { event: "connect"; url: string; token: string };

streamDeck.ui.onSendToPlugin<UiMessage>(async (ev) => {
  const message = ev.payload;
  switch (message.event) {
    case "getInboxTags":
      sendToPropertyInspector({ event: "getInboxTags", items: inboxTagItems() });
      break;
    case "getStatus":
      sendToPropertyInspector(statusMessage());
      break;
    case "connect": {
      const url = message.url.trim().replace(/\/+$/, "");
      const token = message.token.trim();
      const result = await paperless.test(url, token);
      if (result.ok) {
        await saveSettings({ url, token });
      }
      sendToPropertyInspector({ event: "connect", ...result });
      break;
    }
    case "disconnect":
      await saveSettings({ url: paperless.settings.url });
      break;
  }
});

function inboxTagItems(): JsonValue {
  const tags = paperless.inboxTags();
  const items = tags.map((t) => ({ label: t.name, value: String(t.id) }));
  return tags.length > 1 ? [{ label: "All inbox tags", value: "0" }, ...items] : items;
}

function statusMessage(): JsonValue {
  return {
    event: "status",
    state: paperless.state,
    url: paperless.settings.url ?? "",
    error: paperless.error ?? "",
    connected: Boolean(paperless.settings.token),
    inboxTagCount: paperless.inboxTags().length,
  };
}

function sendToPropertyInspector(payload: JsonValue): void {
  if (streamDeck.ui.action) {
    streamDeck.ui.sendToPropertyInspector(payload).catch(() => undefined);
  }
}

async function saveSettings(settings: PaperlessSettings): Promise<void> {
  await streamDeck.settings.setGlobalSettings(settings);
  paperless.configure(settings);
  sendToPropertyInspector(statusMessage());
}

streamDeck.settings.onDidReceiveGlobalSettings<PaperlessSettings>((ev) => paperless.configure(ev.settings));

await streamDeck.connect();
paperless.configure(await streamDeck.settings.getGlobalSettings<PaperlessSettings>());
