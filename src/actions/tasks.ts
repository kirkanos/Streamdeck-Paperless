import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import { PLUGIN_ID } from "../config";
import { tasksUrl } from "../paperless/model";
import { paperless } from "../paperless/service";
import { messageKey, tasksKey } from "../render/keys";
import { showImage, updates } from "../throttle";
import { unavailableImage } from "./inbox";

export type TasksSettings = Record<string, never>;

/** A key showing running and failed paperless tasks; pressing it opens the tasks page. */
@action({ UUID: `${PLUGIN_ID}.tasks` })
export class TasksAction extends SingletonAction<TasksSettings> {
  readonly #visible = new Set<string>();

  override onWillAppear(ev: WillAppearEvent<TasksSettings>): Promise<void> {
    this.#visible.add(ev.action.id);
    return this.#render(ev.action.id);
  }

  override onWillDisappear(ev: WillDisappearEvent<TasksSettings>): void {
    this.#visible.delete(ev.action.id);
    updates.forget(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<TasksSettings>): Promise<void> {
    await this.#render(ev.action.id);
    void paperless.refresh();
  }

  override async onKeyDown(ev: KeyDownEvent<TasksSettings>): Promise<void> {
    const url = paperless.settings.url;
    if (!url) {
      await ev.action.showAlert();
      return;
    }
    await streamDeck.system.openUrl(tasksUrl(url));
  }

  /** Re-renders all visible keys. */
  async refresh(): Promise<void> {
    for (const id of this.#visible) {
      await this.#render(id);
    }
  }

  async #render(actionId: string): Promise<void> {
    const key = this.actions.find((a) => a.id === actionId);
    if (!key?.isKey()) {
      return;
    }

    const unavailable = unavailableImage();
    if (unavailable) {
      showImage(key, unavailable);
      return;
    }

    const tasks = paperless.tasks();
    if (!tasks) {
      showImage(key, messageKey("Tasks", paperless.tasksError ? "not readable" : "loading…"));
      return;
    }
    showImage(key, tasksKey(tasks));
  }
}
