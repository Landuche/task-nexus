import { Plus } from "lucide-react";
import { TaskList } from "@/components/TaskList";
import { TaskStats } from "@/components/TaskStats";
import { ButtonLink } from "@/components/ui/button";
import { caller } from "@/server/caller";

// Rendered per request so the list and stats are always fresh on the server.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [initialPage, initialStats] = await Promise.all([
    caller.tasks.list({ limit: 10, filter: "all" }),
    caller.tasks.stats(),
  ]);

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My tasks</h1>
          <p className="mt-1 text-sm text-zinc-500">Keep track of what needs to get done.</p>
        </div>
        <ButtonLink href="/tasks/new">
          <Plus className="size-4" aria-hidden />
          New task
        </ButtonLink>
      </div>

      <TaskStats initialStats={initialStats} />
      <TaskList initialPage={initialPage} />
    </>
  );
}
