import { z } from "zod";
import type { SortOrder } from "@/lib/schemas";
import type { Task } from "./tasks-store";

// Keyset cursor: points at the last task returned, so pages stay stable when tasks are added or removed.
const cursorPayloadSchema = z.object({ t: z.number().int(), i: z.string().uuid() }).strict();

export type CursorKey = z.infer<typeof cursorPayloadSchema>;

export function encodeCursor(task: Task) {
  return Buffer.from(JSON.stringify({ t: task.createdAt.getTime(), i: task.id })).toString("base64url");
}

export function decodeCursor(value: string): CursorKey | null {
  try {
    const parsed = cursorPayloadSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Ties on creation time are broken by id, in the same direction, so every task has a unique position.
function compareKeys(a: CursorKey, b: CursorKey, order: SortOrder) {
  const direction = order === "newest" ? -1 : 1;
  if (a.t !== b.t) return (a.t - b.t) * direction;
  if (a.i === b.i) return 0;
  return (a.i < b.i ? -1 : 1) * direction;
}

export function taskKey(task: Task): CursorKey {
  return { t: task.createdAt.getTime(), i: task.id };
}

export function compareTasks(a: Task, b: Task, order: SortOrder) {
  return compareKeys(taskKey(a), taskKey(b), order);
}

export function isAfterCursor(task: Task, cursor: CursorKey, order: SortOrder) {
  return compareKeys(taskKey(task), cursor, order) > 0;
}
