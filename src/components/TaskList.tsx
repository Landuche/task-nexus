"use client";

import { AlertCircle, ClipboardList, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { SEARCH_MAX, type Filter, type SortOrder } from "@/lib/schemas";
import type { Task } from "@/server/tasks-store";
import { trpc } from "@/trpc/client";
import { TaskItem } from "./TaskItem";

type Page = { items: Task[]; total: number; nextCursor: string | null };

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function TaskList({ initialPage }: { initialPage: Page }) {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("all");
  const [order, setOrder] = useState<SortOrder>("newest");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setAppliedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const input = useMemo(
    () => ({ limit: PAGE_SIZE, filter, order, search: appliedSearch || undefined }),
    [filter, order, appliedSearch],
  );

  // The server-rendered page only covers the default view; other views are fetched on the client.
  const isDefaultView = filter === "all" && appliedSearch === "" && order === "newest";

  const list = trpc.tasks.list.useInfiniteQuery(input, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: isDefaultView ? { pages: [initialPage], pageParams: [undefined] } : undefined,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggle = trpc.tasks.update.useMutation({
    onMutate: ({ id, completed }) => {
      void utils.tasks.list.cancel(input);
      const previous = utils.tasks.list.getInfiniteData(input);
      utils.tasks.list.setInfiniteData(input, (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === id ? { ...item, completed: completed ?? item.completed } : item,
            ),
          })),
        },
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) utils.tasks.list.setInfiniteData(input, context.previous);
      toast.error("Could not update the task", { description: error.message });
    },
    onSettled: () => utils.tasks.invalidate(),
  });

  const remove = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      setConfirmingId(null);
    },
    onError: (error) => toast.error("Could not delete the task", { description: error.message }),
    onSettled: () => utils.tasks.invalidate(),
  });

  const tasks = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages.at(-1)?.total ?? 0;
  const isFiltering = filter !== "all" || appliedSearch !== "";

  function clearFilters() {
    setSearch("");
    setAppliedSearch("");
    setFilter("all");
  }

  return (
    <section aria-labelledby="task-list-title" className="space-y-4">
      <h2 id="task-list-title" className="sr-only">
        Task list
      </h2>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
        <div role="radiogroup" aria-label="Filter by status" className="inline-flex w-fit rounded-lg bg-zinc-200/60 p-1 dark:bg-zinc-800">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                filter === option.value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={search}
            maxLength={SEARCH_MAX}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-9 text-sm [&::-webkit-search-cancel-button]:appearance-none shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <select
          aria-label="Sort by creation date"
          value={order}
          onChange={(event) => setOrder(event.target.value === "oldest" ? "oldest" : "newest")}
          className="cursor-pointer rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-8 text-sm shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900 md:w-44"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <p className="text-sm text-zinc-500" aria-live="polite">
        {list.isPending ? "Loading…" : `${total} ${total === 1 ? "task" : "tasks"}`}
      </p>

      {list.isError && (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/40">
          <AlertCircle className="size-8 text-red-600" aria-hidden />
          <p className="font-medium text-red-900 dark:text-red-200">Could not load tasks.</p>
          <p className="text-sm text-red-700 dark:text-red-300">{list.error.message}</p>
          <Button variant="secondary" onClick={() => list.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!list.isError && tasks.length === 0 && !list.isPending && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <ClipboardList className="size-10 text-zinc-400" aria-hidden />
          {isFiltering ? (
            <>
              <p className="font-medium">No tasks found</p>
              <p className="text-sm text-zinc-500">Try another search term or filter.</p>
              <Button variant="secondary" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">No tasks yet</p>
              <p className="text-sm text-zinc-500">Create your first task to get started.</p>
              <ButtonLink href="/tasks/new" className="mt-2">
                Create task
              </ButtonLink>
            </>
          )}
        </div>
      )}

      {tasks.length > 0 && (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isConfirming={confirmingId === task.id}
              isDeleting={remove.isPending && remove.variables?.id === task.id}
              onToggle={(completed) => toggle.mutate({ id: task.id, completed })}
              onRequestDelete={() => setConfirmingId(task.id)}
              onConfirmDelete={() => remove.mutate({ id: task.id })}
              onCancelDelete={() => setConfirmingId(null)}
            />
          ))}
        </ul>
      )}

      <div ref={sentinel} className="flex justify-center py-2">
        {isFetchingNextPage && <p className="text-sm text-zinc-500">Loading more tasks…</p>}
        {!isFetchingNextPage && hasNextPage && (
          <Button variant="ghost" onClick={() => fetchNextPage()}>
            Load more
          </Button>
        )}
        {!hasNextPage && tasks.length > 0 && <p className="text-sm text-zinc-400">You&apos;ve reached the end of the list.</p>}
      </div>
    </section>
  );
}
