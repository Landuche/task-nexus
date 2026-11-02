"use client";

import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { trpc } from "@/trpc/client";

type Stats = { total: number; completed: number; pending: number };

export function TaskStats({ initialStats }: { initialStats: Stats }) {
  const { data = initialStats } = trpc.tasks.stats.useQuery(undefined, { initialData: initialStats });
  const percentage = data.total === 0 ? 0 : Math.round((data.completed / data.total) * 100);

  return (
    <section aria-label="Summary" className="mb-8 grid gap-3 sm:grid-cols-3">
      <StatCard icon={<ListTodo className="size-4" aria-hidden />} label="Total" value={data.total} />
      <StatCard icon={<Circle className="size-4" aria-hidden />} label="Pending" value={data.pending} />
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
          Completed
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {data.completed}
          <span className="ml-2 text-sm font-normal text-zinc-500">{percentage}%</span>
        </p>
        <div
          role="progressbar"
          aria-label="Overall progress"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
