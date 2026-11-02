import { describe, expect, it } from "vitest";
import { appRouter } from "./_app";

const api = appRouter.createCaller({});
const MISSING_ID = "00000000-0000-4000-8000-000000000000";

describe("input validation", () => {
  it.each([
    ["empty title", { title: "" }],
    ["whitespace-only title", { title: "   " }],
    ["missing title", {}],
    ["title too long", { title: "a".repeat(121) }],
    ["title with control character", { title: "hi\u0000" }],
    ["description too long", { title: "ok", description: "a".repeat(501) }],
    ["unexpected field (mass assignment)", { title: "ok", id: MISSING_ID }],
    ["client-defined creation date", { title: "ok", createdAt: "2000-01-01" }],
    ["wrong type for completed", { title: "ok", completed: "yes" }],
  ])("rejects creation with %s", async (_, input) => {
    await expect(api.tasks.create(input as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an ID that is not a UUID", async () => {
    await expect(api.tasks.get({ id: "../../etc/passwd" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects pagination outside the allowed range", async () => {
    await expect(api.tasks.list({ cursor: "not base64!", limit: 10, filter: "all" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(api.tasks.list({ limit: 10_000, filter: "all" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects an unknown filter", async () => {
    await expect(api.tasks.list({ limit: 10, filter: "all; DROP" as never })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects an out-of-range debug quantity", async () => {
    await expect(api.tasks.generateMock({ count: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(api.tasks.generateMock({ count: 501 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("business rules", () => {
  it("normalizes the title and drops an empty description", async () => {
    const created = await api.tasks.create({ title: "  New  ", description: "   " });
    expect(created.title).toBe("New");
    expect(created.description).toBeUndefined();
    expect(created.completed).toBe(false);
  });

  it("updates only the fields that were sent", async () => {
    const created = await api.tasks.create({ title: "Old", description: "Desc" });
    const updated = await api.tasks.update({ id: created.id, completed: true });
    expect(updated?.title).toBe("Old");
    expect(updated?.description).toBe("Desc");
    expect(updated?.completed).toBe(true);
  });

  it("returns NOT_FOUND when updating, reading or deleting a missing task", async () => {
    await expect(api.tasks.update({ id: MISSING_ID, title: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.tasks.get({ id: MISSING_ID })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.tasks.delete({ id: MISSING_ID })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("does not return a task after it is deleted", async () => {
    const created = await api.tasks.create({ title: "Disposable" });
    await api.tasks.delete({ id: created.id });
    await expect(api.tasks.get({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("filters by status and search term", async () => {
    const marker = `search-${Date.now()}`;
    await api.tasks.create({ title: `${marker} done`, completed: true });
    await api.tasks.create({ title: `${marker} open` });

    const completed = await api.tasks.list({ limit: 50, filter: "completed", search: marker });
    expect(completed.items.map((task) => task.title)).toEqual([`${marker} done`]);

    const pending = await api.tasks.list({ limit: 50, filter: "pending", search: marker });
    expect(pending.items.map((task) => task.title)).toEqual([`${marker} open`]);
  });

  it("accepts the direction field sent by useInfiniteQuery", async () => {
    const page = await api.tasks.list({ limit: 10, filter: "all", direction: "forward" });
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("returns copies: mutating a result does not change the store", async () => {
    const created = await api.tasks.create({ title: "Immutable" });
    created.title = "tampered";
    const fresh = await api.tasks.get({ id: created.id });
    expect(fresh.title).toBe("Immutable");
  });

  it("generates debug tasks and clears them", async () => {
    const before = await api.tasks.stats();
    const result = await api.tasks.generateMock({ count: 15, seed: 99 });
    expect(result).toEqual({ count: 15, seed: 99 });
    expect((await api.tasks.stats()).total).toBe(before.total + 15);

    const cleared = await api.tasks.clearAll();
    expect(cleared.deleted).toBeGreaterThanOrEqual(15);
    expect((await api.tasks.stats()).total).toBe(0);
  });

  it("keeps stats consistent", async () => {
    const stats = await api.tasks.stats();
    expect(stats.total).toBe(stats.completed + stats.pending);
  });
});
