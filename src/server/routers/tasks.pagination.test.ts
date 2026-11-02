import { beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./_app";

const api = appRouter.createCaller({});

async function collectAll(options: {
  limit: number;
  filter?: "all" | "pending" | "completed";
  order?: "newest" | "oldest";
  search?: string;
}) {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.tasks.list({
      limit: options.limit,
      filter: options.filter ?? "all",
      order: options.order ?? "newest",
      search: options.search,
      cursor,
    });
    ids.push(...page.items.map((task) => task.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return ids;
}

describe("keyset pagination", () => {
  beforeEach(async () => {
    await api.tasks.clearAll();
  });

  it("returns every task exactly once across pages", async () => {
    for (let i = 0; i < 7; i++) await api.tasks.create({ title: `task ${i}` });
    const ids = await collectAll({ limit: 3 });
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it("does not skip tasks when one from an earlier page is deleted", async () => {
    for (let i = 0; i < 6; i++) await api.tasks.create({ title: `task ${i}` });
    const ordered = await collectAll({ limit: 6 });

    const first = await api.tasks.list({ limit: 2, filter: "all" });
    await api.tasks.delete({ id: first.items[0]!.id });

    const second = await api.tasks.list({ limit: 10, filter: "all", cursor: first.nextCursor ?? undefined });
    expect(second.items.map((task) => task.id)).toEqual(ordered.slice(2));
  });

  it("does not repeat tasks when a newer one is inserted between pages", async () => {
    for (let i = 0; i < 4; i++) await api.tasks.create({ title: `task ${i}` });

    const first = await api.tasks.list({ limit: 2, filter: "all" });
    await api.tasks.create({ title: "inserted later" });

    const second = await api.tasks.list({ limit: 2, filter: "all", cursor: first.nextCursor ?? undefined });
    const seen = [...first.items, ...second.items].map((task) => task.id);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("respects the filter across pages", async () => {
    for (let i = 0; i < 5; i++) await api.tasks.create({ title: `open ${i}` });
    for (let i = 0; i < 3; i++) await api.tasks.create({ title: `done ${i}`, completed: true });

    const ids = await collectAll({ limit: 2, filter: "completed" });
    expect(ids).toHaveLength(3);
  });

  it("sorts by creation date in both directions", async () => {
    for (let i = 0; i < 5; i++) await api.tasks.create({ title: `dated ${i}` });
    const newest = await collectAll({ limit: 2, order: "newest" });
    const oldest = await collectAll({ limit: 2, order: "oldest" });
    expect(oldest).toEqual([...newest].reverse());
  });

  it("rejects a cursor that is not a valid key", async () => {
    const forged = Buffer.from(JSON.stringify({ t: "x", i: 1 })).toString("base64url");
    await expect(api.tasks.list({ limit: 5, filter: "all", cursor: forged })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns no next cursor on the last page", async () => {
    await api.tasks.create({ title: "only" });
    const page = await api.tasks.list({ limit: 10, filter: "all" });
    expect(page.nextCursor).toBeNull();
    expect(page.total).toBe(1);
  });
});
