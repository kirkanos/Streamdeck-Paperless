import type { TaskCounts } from "../paperless/model";
import { background, mix, svg, text, toDataUrl, truncate } from "./svg";
import { THEME } from "./theme";

/** Key images are drawn at 144×144 and scaled by Stream Deck. */
const S = 144;

/** Inbox tray outline, drawn in the upper part of the key. */
function trayIcon(color: string, opacity = 1): string {
  return (
    `<path d="M30 22h84l14 34v30a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8V56z M16 56h34l8 14h28l8-14h34" ` +
    `fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

export type InboxKey = {
  count: number;
  /** Amber from this many documents on. */
  threshold: number;
  /** Caption under the count, e.g. the tag name; omitted when the user sets a title. */
  label?: string;
};

/** Number of documents in the inbox: gray at zero, amber from the threshold on. */
export function inboxKey(k: InboxKey): string {
  const empty = k.count <= 0;
  const alert = !empty && k.count >= k.threshold;

  const bg = alert
    ? background("bg", mix(THEME.warn, THEME.base, 0.35), mix(THEME.warn, THEME.base, 0.85), S, S)
    : empty
      ? background("bg", THEME.surface, THEME.base, S, S)
      : background("bg", mix(THEME.info, THEME.base, 0.6), THEME.base, S, S);
  const accent = alert ? `<rect x="0" y="0" width="${S}" height="5" fill="${THEME.warn}"/>` : "";

  // The tray is drawn small above the count; it dims with the count.
  const tray = `<g transform="translate(46 8) scale(0.36)">${trayIcon(empty ? THEME.subtle : "#FFFFFF", empty ? 0.6 : 0.9)}</g>`;

  const value = String(k.count);
  const size = value.length > 3 ? 40 : 52;
  const number = text(value, {
    x: S / 2,
    y: 96,
    size,
    weight: 800,
    fill: empty ? THEME.subtle : "#FFFFFF",
  });
  const label = k.label ? text(truncate(k.label, 14), { x: S / 2, y: 124, size: 15, weight: 600, opacity: 0.75 }) : "";

  return toDataUrl(svg(S, S, bg + accent + tray + number + label));
}

/** Running and failed tasks: red as soon as one failed. */
export function tasksKey(t: TaskCounts): string {
  const failed = t.failed > 0;
  const busy = t.running > 0;

  const bg = failed
    ? background("bg", mix(THEME.error, "#000000", 0.05), mix(THEME.error, THEME.base, 0.55), S, S)
    : busy
      ? background("bg", mix(THEME.info, THEME.base, 0.6), THEME.base, S, S)
      : background("bg", THEME.surface, THEME.base, S, S);
  const accent = `<rect x="0" y="0" width="${S}" height="5" fill="${failed ? THEME.error : busy ? THEME.info : THEME.muted}"/>`;

  const [count, label] = failed ? [t.failed, "failed"] : busy ? [t.running, "running"] : [0, "idle"];
  const number = text(String(count), {
    x: S / 2,
    y: 82,
    size: 48,
    weight: 800,
    fill: failed || busy ? "#FFFFFF" : THEME.subtle,
  });
  const caption = text(label, { x: S / 2, y: 106, size: 16, weight: 600, opacity: 0.8 });
  const detail = failed && busy ? text(`${t.running} running`, { x: S / 2, y: 126, size: 13, weight: 600, opacity: 0.7 }) : "";

  const title = text("Tasks", { x: S / 2, y: 30, size: 17, weight: 700, opacity: 0.85 });

  return toDataUrl(svg(S, S, bg + accent + title + number + caption + detail));
}

/** Neutral key with two lines of text, e.g. "Connect / see settings" or "Offline". */
export function messageKey(title: string, subtitle: string): string {
  return toDataUrl(
    svg(
      S,
      S,
      background("bg", THEME.surface, THEME.base, S, S) +
        `<rect x="3" y="3" width="${S - 6}" height="${S - 6}" rx="14" fill="none" stroke="${THEME.muted}" stroke-width="2"/>` +
        text(title, { x: S / 2, y: 68, size: 22, weight: 800 }) +
        text(subtitle, { x: S / 2, y: 92, size: 15, weight: 600, fill: THEME.subtle }),
    ),
  );
}
