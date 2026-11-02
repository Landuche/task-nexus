import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

// The Zod flattened error travels in the payload so forms can show per-field messages.
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
