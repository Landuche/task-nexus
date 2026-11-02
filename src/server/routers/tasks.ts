import { TRPCError } from "@trpc/server";
import { generateMockTasks } from "@/lib/mock-tasks";
import {
  createTaskSchema,
  generateMockSchema,
  idInputSchema,
  listTasksSchema,
  updateTaskSchema,
} from "@/lib/schemas";
import { publicProcedure, router } from "../trpc";
import { decodeCursor } from "../cursor";
import {
  MAX_TASKS,
  clearTasks,
  createTask,
  deleteTask,
  getStats,
  getTask,
  insertMockTasks,
  listTasks,
  remainingCapacity,
  updateTask,
} from "../tasks-store";

function findOrThrow(id: string) {
  const task = getTask(id);
  if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  return task;
}

export const tasksRouter = router({
  list: publicProcedure.input(listTasksSchema).query(({ input }) => {
    const after = input.cursor === undefined ? undefined : decodeCursor(input.cursor);
    if (input.cursor !== undefined && !after) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cursor" });
    }
    return listTasks({
      limit: input.limit,
      filter: input.filter,
      order: input.order,
      search: input.search,
      after: after ?? undefined,
    });
  }),

  stats: publicProcedure.query(() => getStats()),

  get: publicProcedure.input(idInputSchema).query(({ input }) => findOrThrow(input.id)),

  create: publicProcedure.input(createTaskSchema).mutation(({ input }) => {
    if (remainingCapacity() < 1) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Task limit of ${MAX_TASKS} reached` });
    }
    return createTask(input);
  }),

  update: publicProcedure.input(updateTaskSchema).mutation(({ input }) => {
    findOrThrow(input.id);
    const { id, ...changes } = input;
    return updateTask(id, changes);
  }),

  delete: publicProcedure.input(idInputSchema).mutation(({ input }) => {
    findOrThrow(input.id);
    deleteTask(input.id);
    return { id: input.id };
  }),

  generateMock: publicProcedure.input(generateMockSchema).mutation(({ input }) => {
    if (input.count > remainingCapacity()) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Only ${remainingCapacity()} slots left (limit ${MAX_TASKS})`,
      });
    }
    const seed = input.seed ?? Math.floor(Math.random() * 4_294_967_296);
    const count = insertMockTasks(generateMockTasks({ count: input.count, seed, now: Date.now() }));
    return { count, seed };
  }),

  clearAll: publicProcedure.mutation(() => ({ deleted: clearTasks() })),
});
