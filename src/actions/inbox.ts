import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type TitleParametersDidChangeEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import { PLUGIN_ID } from "../config";
import { inboxCount, inboxThreshold, inboxUrl, selectedTagId } from "../paperless/model";
import { paperless } from "../paperless/service";
import { inboxKey, messageKey } from "../render/keys";
import { showImage, updates } from "../throttle";

export type InboxSettings = {
  /** Inbox tag id as string; "0" or missing sums all inbox tags. */
  tagId?: string;
  threshold?: string | number;
};

/** Image for keys that cannot show data (not configured, offline). */
export function unavailableImage(): string | undefined {
  if (paperless.state === "unconfigured") {
    return messageKey("Connect", "see settings");
  }
  if (!paperless.isConnected) {
    return messageKey("Offline", paperless.state === "error" ? "check settings" : "connecting…");
  }
  return undefined;
}

/** A key showing the number of documents in the paperless inbox; pressing it opens the inbox. */
@action({ UUID: `${PLUGIN_ID}.inbox` })
export class InboxAction extends SingletonAction<InboxSettings> {
  readonly #settings = new Map<string, InboxSettings>();
  /** Keys with a user-defined title: the tag name is not drawn into the image then. */
  readonly #hasTitle = new Map<string, boolean>();

  override onWillAppear(ev: WillAppearEvent<InboxSettings>): Promise<void> {
    this.#settings.set(ev.action.id, ev.payload.settings);
    return this.#render(ev.action.id);
  }

  override onWillDisappear(ev: WillDisappearEvent<InboxSettings>): void {
    this.#settings.delete(ev.action.id);
    this.#hasTitle.delete(ev.action.id);
    updates.forget(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<InboxSettings>): Promise<void> {
    this.#settings.set(ev.action.id, ev.payload.settings);
    await this.#render(ev.action.id);
    void paperless.refresh();
  }

  override onTitleParametersDidChange(ev: TitleParametersDidChangeEvent<InboxSettings>): Promise<void> {
    this.#hasTitle.set(ev.action.id, ev.payload.title.trim() !== "");
    return this.#render(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent<InboxSettings>): Promise<void> {
    const url = paperless.settings.url;
    if (!url) {
      await ev.action.showAlert();
      return;
    }
    const selected = selectedTagId(ev.payload.settings.tagId);
    const tagIds = selected !== undefined ? [selected] : paperless.inboxTags().map((t) => t.id);
    await streamDeck.system.openUrl(inboxUrl(url, tagIds));
  }

  /** Re-renders all visible keys. */
  async refresh(): Promise<void> {
    for (const id of this.#settings.keys()) {
      await this.#render(id);
    }
  }

  async #render(actionId: string): Promise<void> {
    const key = this.actions.find((a) => a.id === actionId);
    const settings = this.#settings.get(actionId);
    if (!key?.isKey() || !settings) {
      return;
    }

    const unavailable = unavailableImage();
    if (unavailable) {
      showImage(key, unavailable);
      return;
    }

    const tags = paperless.inboxTags();
    const selected = selectedTagId(settings.tagId);
    if (tags.length === 0) {
      showImage(key, messageKey("No inbox", "tag found"));
      return;
    }
    if (selected !== undefined && !tags.some((t) => t.id === selected)) {
      showImage(key, messageKey("Unknown", "inbox tag"));
      return;
    }

    const tag = selected !== undefined ? tags.find((t) => t.id === selected) : tags.length === 1 ? tags[0] : undefined;
    showImage(
      key,
      inboxKey({
        count: inboxCount(tags, selected),
        threshold: inboxThreshold(settings.threshold),
        label: this.#hasTitle.get(actionId) ? undefined : (tag?.name ?? "Inbox"),
      }),
    );
  }
}
