import { describe, expect, it } from "vitest";
import { TITLE_MAX } from "./schemas";
import { generateMockTasks } from "./mock-tasks";

const now = Date.UTC(2026, 10, 1);

describe("generateMockTasks", () => {
  it("returns the requested amount of valid tasks", () => {
    const tasks = generateMockTasks({ count: 100, seed: 7, now });
    expect(tasks).toHaveLength(100);
    for (const task of tasks) {
      expect(task.title.length).toBeGreaterThan(0);
      expect(task.title.length).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it("is deterministic for the same seed", () => {
    expect(generateMockTasks({ count: 20, seed: 42, now })).toEqual(
      generateMockTasks({ count: 20, seed: 42, now }),
    );
  });

  it("produces different data for different seeds", () => {
    const a = generateMockTasks({ count: 20, seed: 1, now }).map((task) => task.title);
    const b = generateMockTasks({ count: 20, seed: 2, now }).map((task) => task.title);
    expect(a).not.toEqual(b);
  });

  it("spreads creation dates over the past 60 days", () => {
    const tasks = generateMockTasks({ count: 200, seed: 3, now });
    for (const task of tasks) {
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(now);
      expect(task.createdAt.getTime()).toBeGreaterThan(now - 60 * 24 * 60 * 60 * 1000);
    }
  });
});
