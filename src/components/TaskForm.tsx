"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { TRPCClientErrorLike } from "@trpc/client";
import { Button } from "@/components/ui/button";
import { DESCRIPTION_MAX, TITLE_MAX, taskFormSchema, type TaskFormValues } from "@/lib/schemas";
import type { AppRouter } from "@/server/routers/_app";
import { trpc } from "@/trpc/client";

type Props = {
  task?: { id: string; title: string; description?: string; completed: boolean };
};

type ClientError = TRPCClientErrorLike<AppRouter>;

const inputBase =
  "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-4 dark:bg-zinc-900";
const inputOk = `${inputBase} border-zinc-300 focus:border-accent focus:ring-accent/15 dark:border-zinc-700`;
const inputError = `${inputBase} border-red-500 focus:ring-red-500/15`;

export function TaskForm({ task }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      completed: task?.completed ?? false,
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = form;

  const title = watch("title") ?? "";
  const description = watch("description") ?? "";

  const onSaved = async (message: string) => {
    await utils.tasks.invalidate();
    toast.success(message);
    router.push("/");
  };

  // Field errors come from the server's Zod validation; anything else goes to the form-level alert.
  const onServerError = (error: ClientError) => {
    const fields = error.data?.zodError?.fieldErrors;
    if (fields?.title?.[0]) setError("title", { message: fields.title[0] });
    else if (fields?.description?.[0]) setError("description", { message: fields.description[0] });
    else setError("root.server", { message: error.message });
  };

  const create = trpc.tasks.create.useMutation({
    onSuccess: () => onSaved("Task created"),
    onError: onServerError,
  });
  const update = trpc.tasks.update.useMutation({
    onSuccess: () => onSaved("Changes saved"),
    onError: onServerError,
  });
  const isSaving = create.isPending || update.isPending;

  const onSubmit = handleSubmit((values) => {
    clearErrors("root.server");
    const description = values.description.trim();
    if (task) {
      update.mutate({ id: task.id, title: values.title, description, completed: values.completed });
    } else {
      create.mutate({
        title: values.title,
        description: description || undefined,
        completed: values.completed,
      });
    }
  });

  const titleError = errors.title?.message;
  const descriptionError = errors.description?.message;
  const serverError = errors.root?.server?.message;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
    >
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-red-600">*</span>
          </label>
          <span className="text-xs tabular-nums text-zinc-400">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <input
          id="title"
          autoFocus
          maxLength={TITLE_MAX}
          placeholder="e.g. Send the weekly report"
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "title-error" : undefined}
          className={titleError ? inputError : inputOk}
          {...register("title")}
        />
        {titleError && (
          <p id="title-error" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="size-3.5" aria-hidden />
            {titleError}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="description" className="text-sm font-medium">
            Description <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <span className="text-xs tabular-nums text-zinc-400">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="description"
          rows={4}
          maxLength={DESCRIPTION_MAX}
          placeholder="Details, context or next steps"
          aria-invalid={Boolean(descriptionError)}
          aria-describedby={descriptionError ? "description-error" : undefined}
          className={`${descriptionError ? inputError : inputOk} resize-y`}
          {...register("description")}
        />
        {descriptionError && (
          <p id="description-error" className="mt-1.5 text-sm text-red-600">
            {descriptionError}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-emerald-600" {...register("completed")} />
        Mark as completed
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-end dark:border-zinc-800">
        <Button variant="secondary" type="button" onClick={() => router.push("/")} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {task ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
