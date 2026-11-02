"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bug } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MOCK_COUNT_MAX, generateMockFormSchema, type GenerateMockFormValues } from "@/lib/schemas";
import { trpc } from "@/trpc/client";

export function DebugMenu() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const countId = useId();
  const seedId = useId();
  const countErrorId = useId();
  const seedErrorId = useId();

  const form = useForm<GenerateMockFormValues>({
    resolver: zodResolver(generateMockFormSchema),
    defaultValues: { count: 20, seed: "" },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const generate = trpc.tasks.generateMock.useMutation({
    onSuccess: ({ count, seed }) => {
      toast.success(`Generated ${count} tasks`, { description: `Seed ${seed}` });
      utils.tasks.invalidate();
    },
    onError: (error) => toast.error("Could not generate tasks", { description: error.message }),
  });

  const clearAll = trpc.tasks.clearAll.useMutation({
    onSuccess: ({ deleted }) => {
      toast.success(`Deleted ${deleted} tasks`);
      setConfirmingClear(false);
      utils.tasks.invalidate();
    },
    onError: (error) => toast.error("Could not delete tasks", { description: error.message }),
  });

  const onSubmit = handleSubmit(({ count, seed }) => {
    const trimmed = seed.trim();
    generate.mutate({ count, seed: trimmed === "" ? undefined : Number(trimmed) });
  });

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <Bug className="size-4" aria-hidden />
        Debug
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Debug tools"
          className="absolute right-0 z-20 mt-2 w-72 space-y-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <form noValidate onSubmit={onSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Generate random tasks</p>
              <p className="mt-0.5 text-xs text-zinc-500">Useful for testing infinite scroll and filters.</p>
            </div>

            <div>
              <label htmlFor={countId} className="text-sm font-medium">
                Quantity
              </label>
              <input
                id={countId}
                type="number"
                min={1}
                max={MOCK_COUNT_MAX}
                aria-invalid={Boolean(errors.count)}
                aria-describedby={errors.count ? countErrorId : undefined}
                className={inputClass}
                {...register("count", { valueAsNumber: true })}
              />
              {errors.count && (
                <p id={countErrorId} className="mt-1 text-xs text-red-600">
                  {errors.count.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={seedId} className="text-sm font-medium">
                Seed <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id={seedId}
                inputMode="numeric"
                placeholder="Random"
                aria-invalid={Boolean(errors.seed)}
                aria-describedby={errors.seed ? seedErrorId : "seed-hint"}
                className={inputClass}
                {...register("seed")}
              />
              {errors.seed ? (
                <p id={seedErrorId} className="mt-1 text-xs text-red-600">
                  {errors.seed.message}
                </p>
              ) : (
                <p id="seed-hint" className="mt-1 text-xs text-zinc-500">
                  The same seed always generates the same tasks.
                </p>
              )}
            </div>

            <Button type="submit" loading={generate.isPending} className="w-full">
              Generate
            </Button>
          </form>

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {confirmingClear ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Delete all tasks?</span>
                <div className="flex gap-1">
                  <Button variant="danger" className="px-3 py-1.5" loading={clearAll.isPending} onClick={() => clearAll.mutate()}>
                    Yes
                  </Button>
                  <Button variant="ghost" className="px-3 py-1.5" onClick={() => setConfirmingClear(false)} disabled={clearAll.isPending}>
                    No
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50" onClick={() => setConfirmingClear(true)}>
                Delete all tasks
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
