import { z } from "zod";

// Shared between the browser and the server. The server is the source of truth;
// client-side validation only gives immediate feedback.

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 500;
export const SEARCH_MAX = 100;
export const PAGE_SIZE_MAX = 50;
export const MOCK_COUNT_MAX = 500;

const CONTROL_TITLE = /[\u0000-\u001F\u007F]/;
// Line breaks and tabs are allowed in descriptions.
const CONTROL_DESCRIPTION = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const titleSchema = z
  .string({ required_error: "Title is required" })
  .trim()
  .min(1, "Title is required")
  .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`)
  .refine((value) => !CONTROL_TITLE.test(value), "Title contains invalid characters");

export const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`)
  .refine((value) => !CONTROL_DESCRIPTION.test(value), "Description contains invalid characters");

export const idSchema = z.string().uuid("Invalid task ID");
export const idInputSchema = z.object({ id: idSchema }).strict();

export const filterSchema = z.enum(["all", "pending", "completed"]);
export type Filter = z.infer<typeof filterSchema>;

export const sortOrderSchema = z.enum(["newest", "oldest"]);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    completed: z.boolean().optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    id: idSchema,
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    completed: z.boolean().optional(),
  })
  .strict();

export const listTasksSchema = z
  .object({
    cursor: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9_-]+$/, "Invalid cursor")
      .optional(),
    limit: z.number().int().min(1).max(PAGE_SIZE_MAX).default(10),
    search: z
      .string()
      .trim()
      .max(SEARCH_MAX, `Search must be at most ${SEARCH_MAX} characters`)
      .optional(),
    filter: filterSchema.default("all"),
    order: sortOrderSchema.default("newest"),
    // Added automatically by tRPC's useInfiniteQuery; .strict() would reject the query without it.
    direction: z.enum(["forward", "backward"]).optional(),
  })
  .strict();

export const taskFormSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  completed: z.boolean(),
});
export type TaskFormValues = z.input<typeof taskFormSchema>;

export const generateMockSchema = z
  .object({
    count: z.number().int().min(1).max(MOCK_COUNT_MAX),
    seed: z.number().int().min(0).max(4_294_967_295).optional(),
  })
  .strict();

export const generateMockFormSchema = z.object({
  count: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Must be a whole number")
    .min(1, "Minimum is 1")
    .max(MOCK_COUNT_MAX, `Maximum is ${MOCK_COUNT_MAX}`),
  seed: z
    .string()
    .trim()
    .regex(/^\d*$/, "Digits only")
    .max(10, "Too long"),
});
export type GenerateMockFormValues = z.input<typeof generateMockFormSchema>;
