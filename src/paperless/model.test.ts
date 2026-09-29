import { describe, expect, it } from "vitest";
import { countTasks, inboxCount, inboxThreshold, inboxUrl, normalizeBaseUrl, selectedTagId, tasksUrl } from "./model";

const tags = [
  { id: 3, name: "Inbox", count: 4 },
  { id: 7, name: "Scan Inbox", count: 2 },
];

describe("inboxCount", () => {
  it("sums all inbox tags when none is selected", () => {
    expect(inboxCount(tags)).toBe(6);
    expect(inboxCount([])).toBe(0);
  });

  it("uses only the selected tag", () => {
    expect(inboxCount(tags, 7)).toBe(2);
    expect(inboxCount(tags, 99)).toBe(0);
  });

  it("reads the selection from the key settings", () => {
    expect(selectedTagId("7")).toBe(7);
    expect(selectedTagId(7)).toBe(7);
    expect(selectedTagId("0")).toBeUndefined();
    expect(selectedTagId("")).toBeUndefined();
    expect(selectedTagId(undefined)).toBeUndefined();
    expect(selectedTagId("abc")).toBeUndefined();
  });

  it("clamps the threshold to at least 1", () => {
    expect(inboxThreshold(undefined)).toBe(1);
    expect(inboxThreshold("0")).toBe(1);
    expect(inboxThreshold("5")).toBe(5);
    expect(inboxThreshold(3.7)).toBe(3);
  });
});

describe("countTasks", () => {
  it("counts pending and started as running, unacknowledged failures as failed", () => {
    expect(
      countTasks([
        { id: 1, status: "PENDING" },
        { id: 2, status: "STARTED" },
        { id: 3, status: "SUCCESS" },
        { id: 4, status: "FAILURE" },
        { id: 5, status: "FAILURE", acknowledged: true },
        { id: 6, status: "REVOKED" },
      ]),
    ).toEqual({ running: 2, failed: 1 });
  });

  it("is zero without tasks", () => {
    expect(countTasks([])).toEqual({ running: 0, failed: 0 });
  });
});

describe("urls", () => {
  it("normalizes the base URL", () => {
    expect(normalizeBaseUrl(" https://docs.example.com/ ")).toBe("https://docs.example.com");
    expect(normalizeBaseUrl("docs.example.com")).toBe("https://docs.example.com");
    expect(normalizeBaseUrl("http://localhost:8000//")).toBe("http://localhost:8000");
    expect(normalizeBaseUrl("")).toBe("");
  });

  it("opens the inbox filtered by tag", () => {
    expect(inboxUrl("https://docs.example.com/", [3])).toBe("https://docs.example.com/documents?tags__id__all=3");
    expect(inboxUrl("https://docs.example.com", [3, 7])).toBe("https://docs.example.com/documents?tags__id__in=3,7");
    expect(inboxUrl("https://docs.example.com", [])).toBe("https://docs.example.com/documents");
  });

  it("opens the tasks page", () => {
    expect(tasksUrl("https://docs.example.com/")).toBe("https://docs.example.com/tasks");
  });
});
