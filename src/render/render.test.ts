import { describe, expect, it } from "vitest";
import { inboxKey, messageKey, tasksKey } from "./keys";
import { escapeXml } from "./svg";
import { THEME } from "./theme";

const decode = (dataUrl: string) => Buffer.from(dataUrl.split(",")[1], "base64").toString("utf8");

describe("inboxKey", () => {
  it("is a 144×144 SVG data URL", () => {
    const url = inboxKey({ count: 0, threshold: 1 });
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(decode(url)).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"');
  });

  it("is gray at zero", () => {
    const svg = decode(inboxKey({ count: 0, threshold: 1 }));
    expect(svg).toContain(`stop-color="${THEME.surface}"`);
    expect(svg).not.toContain(THEME.warn);
    expect(svg).toContain(`>0</text>`);
  });

  it("turns amber from the threshold on", () => {
    expect(decode(inboxKey({ count: 2, threshold: 3 }))).not.toContain(THEME.warn);
    const svg = decode(inboxKey({ count: 3, threshold: 3 }));
    expect(svg).toContain(THEME.warn);
    expect(svg).toContain(`>3</text>`);
  });

  it("draws the tag name and escapes it", () => {
    const svg = decode(inboxKey({ count: 1, threshold: 1, label: "Scan & <Inbox>" }));
    expect(svg).toContain("Scan &amp; &lt;Inbox&gt;");
    expect(svg).not.toContain("<Inbox>");
    expect(decode(inboxKey({ count: 1, threshold: 1 }))).not.toContain("Inbox");
  });

  it("escapes xml", () => {
    expect(escapeXml(`<a & "b">`)).toBe("&lt;a &amp; &quot;b&quot;&gt;");
  });
});

describe("tasksKey", () => {
  it("is idle and gray without tasks", () => {
    const svg = decode(tasksKey({ running: 0, failed: 0 }));
    expect(svg).toContain(">idle</text>");
    expect(svg).not.toContain(THEME.error);
  });

  it("shows running tasks", () => {
    const svg = decode(tasksKey({ running: 2, failed: 0 }));
    expect(svg).toContain(">2</text>");
    expect(svg).toContain(">running</text>");
    expect(svg).not.toContain(THEME.error);
  });

  it("turns red and shows the failed count first", () => {
    const svg = decode(tasksKey({ running: 1, failed: 3 }));
    expect(svg).toContain(THEME.error);
    expect(svg).toContain(">3</text>");
    expect(svg).toContain(">failed</text>");
    expect(svg).toContain(">1 running</text>");
  });
});

describe("messageKey", () => {
  it("shows both lines", () => {
    const svg = decode(messageKey("Connect", "see settings"));
    expect(svg).toContain(">Connect</text>");
    expect(svg).toContain(">see settings</text>");
  });
});
