import { randomUUID } from "node:crypto";
import type { Filter, SortOrder } from "@/lib/schemas";
import type { MockTask } from "@/lib/mock-tasks";
import { compareTasks, encodeCursor, isAfterCursor, type CursorKey } from "./cursor";

export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
};

export const MAX_TASKS = 1000;

type Store = { tasks: Task[] };

// Stored on globalThis so the data survives Next.js hot reloads in development.
const globalForStore = globalThis as unknown as { taskStore?: Store };

const store: Store =
  globalForStore.taskStore ??
  (globalForStore.taskStore = {
    tasks: [
      {
        id: randomUUID(),
        title: "Explore the challenge",
        description: "Create, edit and delete tasks using the interface.",
        completed: false,
        createdAt: new Date(Date.now() - 60_000),
      },
      {
        id: randomUUID(),
        title: "Review the code",
        completed: true,
        createdAt: new Date(Date.now() - 120_000),
      },
    ],
  });

function matches(task: Task, filter: Filter, search: string | undefined) {
  if (filter === "pending" && task.completed) return false;
  if (filter === "completed" && !task.completed) return false;
  if (!search) return true;
  const term = search.toLowerCase();
  return task.title.toLowerCase().includes(term) || (task.description?.toLowerCase().includes(term) ?? false);
}

// Returns copies so callers cannot mutate the store by reference.
export function listTasks(options: {
  limit: number;
  filter: Filter;
  order: SortOrder;
  search?: string;
  after?: CursorKey;
}) {
  const { after, order } = options;
  const matching = store.tasks
    .filter((task) => matches(task, options.filter, options.search))
    .sort((a, b) => compareTasks(a, b, order));
  const remaining = after ? matching.filter((task) => isAfterCursor(task, after, order)) : matching;
  const items = remaining.slice(0, options.limit).map((task) => ({ ...task }));
  const last = items.at(-1);
  return {
    items,
    total: matching.length,
    nextCursor: remaining.length > options.limit && last ? encodeCursor(last) : null,
  };
}

export function getStats() {
  const completed = store.tasks.filter((task) => task.completed).length;
  return { total: store.tasks.length, completed, pending: store.tasks.length - completed };
}

export function getTask(id: string) {
  const task = store.tasks.find((item) => item.id === id);
  return task && { ...task };
}

export function remainingCapacity() {
  return MAX_TASKS - store.tasks.length;
}

export function createTask(data: { title: string; description?: string; completed?: boolean }) {
  const task: Task = {
    id: randomUUID(),
    title: data.title,
    description: data.description || undefined,
    completed: data.completed ?? false,
    createdAt: new Date(),
  };
  store.tasks.unshift(task);
  return { ...task };
}

export function insertMockTasks(tasks: MockTask[]) {
  store.tasks.push(...tasks.map((task) => ({ ...task, id: randomUUID() })));
  return tasks.length;
}

export function updateTask(id: string, data: { title?: string; description?: string; completed?: boolean }) {
  const task = store.tasks.find((item) => item.id === id);
  if (!task) return undefined;
  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description || undefined;
  if (data.completed !== undefined) task.completed = data.completed;
  return { ...task };
}

export function deleteTask(id: string) {
  const index = store.tasks.findIndex((task) => task.id === id);
  if (index === -1) return false;
  store.tasks.splice(index, 1);
  return true;
}

export function clearTasks() {
  const deleted = store.tasks.length;
  store.tasks.length = 0;
  return deleted;
}
